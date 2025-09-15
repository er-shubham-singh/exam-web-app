// services/coding.service.js
import mongoose from "mongoose";
import CodingAttempt from "../Modal/codingAttempt.model.js";
import Question from "../Modal/question.model.js";
import ExamLog from "../Modal/examLog.modal.js";
import { runCodeOnJudge } from "./codeRunner.service.js";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

/**
 * Run student code either in debug mode (custom stdin, no DB save)
 * or evaluation mode (run against test cases, save attempt).
 */
export async function runStudentCode({
  studentExamId,
  questionId,
  code = "",
  language = "javascript",
  stdin = "",
  maxAttempts = 3,
  timeLimitMs = 2000,
  runBy = null,
  mode = "evaluation",   // 🔹 default
}) {
  if (!isValidObjectId(studentExamId)) throw new Error("Invalid studentExamId");
  if (!isValidObjectId(questionId)) throw new Error("Invalid questionId");

  const question = await Question.findById(questionId).lean();
  if (!question) throw new Error("Question not found");

  const effectiveMax =
    (question.coding && Number(question.coding.maxRunAttempts)) ||
    Number(maxAttempts) ||
    3;

  // --- DEBUG MODE ---
  if (mode === "debug") {
    console.log("RUN_STUDENT_CODE (DEBUG) ->", {
      stdinPreview: String(stdin),
      codePreview: code.slice(0, 100),
    });

    try {
      const debugResp = await runCodeOnJudge({
        language,
        code,
        stdin,
        timeLimitMs,
        mode: "debug",
      });

      return {
        success: true,
        debug: true,
        runner: debugResp,
      };
    } catch (err) {
      console.error("runStudentCode debug error:", err);
      return { success: false, debug: true, error: String(err) };
    }
  }

  // --- EVALUATION MODE ---
  // count existing attempts
  const existingCount = await CodingAttempt.countDocuments({
    studentExam: studentExamId,
    question: questionId,
  });

  let attemptNumber = existingCount + 1;
  if (attemptNumber > effectiveMax) {
    // log blocked run
    try {
      await ExamLog.create({
        studentExam: studentExamId,
        eventType: "RUN_ATTEMPT_BLOCKED",
        details: {
          questionId,
          reason: "max attempts reached",
          attempts: existingCount,
        },
      });
    } catch {}
    return {
      success: false,
      message: "Max run attempts reached",
      result: { ok: false, remaining: 0 },
    };
  }

  // prepare tests
  const tests = Array.isArray(question.coding?.testCases)
    ? question.coding.testCases.map((tc) => ({
        input:
          typeof tc.input !== "undefined" && tc.input !== null
            ? String(tc.input)
            : "",
        expected:
          typeof tc.expectedOutput !== "undefined" &&
          tc.expectedOutput !== null
            ? String(tc.expectedOutput)
            : "",
        score: Number.isFinite(Number(tc.score))
          ? Number(tc.score)
          : tc.score || 1,
        isPublic: !!tc.isPublic,
      }))
    : [];

  // run against judge
  let runnerResp = null;
  try {
    runnerResp = await runCodeOnJudge({
      language,
      code,
      tests,
      timeLimitMs,
      stdin, // NOTE: this is ignored in evaluation, only test inputs matter
    });
  } catch (err) {
    console.error("runStudentCode evaluation error:", err);
    runnerResp = null;
  }

  const finalResp =
    runnerResp && (Array.isArray(runnerResp.results) || runnerResp.summary)
      ? runnerResp
      : {
          status: "failed",
          summary: { passedCount: 0, totalCount: tests.length },
          results: tests.map((_, idx) => ({
            index: idx,
            passed: false,
            stdout: "",
            stderr: "No runner available",
            timeMs: 0,
            memoryMB: 0,
          })),
          stdout: "",
          stderr: "No runner available",
        };

  const runResult = {
    status:
      finalResp.status ||
      (finalResp.summary?.passedCount === finalResp.summary?.totalCount
        ? "success"
        : "failed"),
    passedCount: finalResp.summary?.passedCount || 0,
    totalCount:
      finalResp.summary?.totalCount ||
      (Array.isArray(finalResp.results) ? finalResp.results.length : 0),
    stdout: Array.isArray(finalResp.results)
      ? finalResp.results.map((r) => r.stdout || "").join("\n")
      : finalResp.stdout || "",
    stderr: Array.isArray(finalResp.results)
      ? finalResp.results.map((r) => r.stderr || "").join("\n")
      : finalResp.stderr || "",
    tests: Array.isArray(finalResp.results)
      ? finalResp.results.map((r) => ({
          index: r.index ?? null,
          passed: !!r.passed,
          stdout: r.stdout ?? "",
          stderr: r.stderr ?? "",
          timeMs: r.timeMs ?? null,
          memoryMB: r.memoryMB ?? null,
        }))
      : [],
  };

  // create attempt
  let attemptDoc = null;
  try {
    attemptDoc = await CodingAttempt.create({
      studentExam: studentExamId,
      question: questionId,
      attemptNumber,
      language,
      code,
      stdin: stdin || "",
      result: runResult,
      runAt: new Date(),
      runBy,
    });
  } catch (err) {
    console.error("Failed to save CodingAttempt:", err);
    throw err;
  }

  // log code run
  try {
    await ExamLog.create({
      studentExam: studentExamId,
      eventType: "CODE_RUN",
      details: {
        questionId,
        attemptNumber: attemptDoc.attemptNumber,
        language,
        passed: runResult.passedCount,
        total: runResult.totalCount,
      },
    });
  } catch {}

  const remaining = Math.max(0, effectiveMax - attemptDoc.attemptNumber);

  return {
    success: true,
    debug: false,
    result: {
      ok: true,
      attemptNumber: attemptDoc.attemptNumber,
      remaining,
      attemptId: attemptDoc._id.toString(),
    },
    attempt: {
      ...attemptDoc.toObject(),
      _id: attemptDoc._id.toString(),
    },
  };
}
