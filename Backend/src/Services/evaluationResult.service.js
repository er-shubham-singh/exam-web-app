
// services/evaluation.service.js
import mongoose from "mongoose";
import StudentExam from "../Modal/stuedntExam.modal.js";
import Question from "../Modal/question.model.js";
import EvaluationResult from "../Modal/evaluationResult.modal.js";
import transporter from "../Config/email.config.js";
import axios from "axios";
import CodingAttempt from "../Modal/codingAttempt.model.js";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

/**
 * Run code on an external judge / compiler endpoint.
 * This is pluggable. For now we attempt to POST to process.env.CODE_RUNNER_URL (if set).
 */
async function runCodeOnJudge({ language, code, tests = [], timeLimitMs = 2000 }) {
  const runnerUrl = process.env.CODE_RUNNER_URL;
  if (!runnerUrl) return null;

  try {
    const payload = { language, code, tests, timeLimitMs };
    const resp = await axios.post(runnerUrl, payload, { timeout: 30000 });
    if (resp && resp.data) return resp.data;
    return null;
  } catch (err) {
    console.error("runCodeOnJudge failed:", err.message || err);
    return null;
  }
}

/**
 * Local fallback evaluator (safe/no-execution) — marks all tests as failed.
 * This prevents accidental awarding of marks when no judge is configured.
 */
function simpleLocalEvaluate({ code, language, tests = [], compareMode = "trimmed" }) {
  const results = tests.map((t, idx) => ({
    index: idx,
    passed: false,
    stdout: "",
    stderr: "No runner available (local fallback).",
    timeMs: 0,
    memoryMB: 0,
  }));
  return { results, summary: { passedCount: 0, totalCount: tests.length } };
}

/**
 * Evaluate theory answers using an external model (Gemini/OpenAI or your adapter).
 *
 * Expected environment:
 * - process.env.GEMINI_API_URL : endpoint that accepts { studentAnswer, modelAnswer, maxMarks }
 *   and returns { score } where 0 <= score <= maxMarks
 *
 * If GEMINI_API_URL is not set or the call fails, this safely returns 0.
 */
export async function evaluateTheoryWithModel(studentAnswer, modelAnswer, maxMarks = 5) {
  const modelUrl = process.env.GEMINI_API_URL;
  if (!modelUrl) {
    console.warn("GEMINI_API_URL not configured — falling back to 0 for theory evaluation.");
    return 0;
  }

  try {
    const payload = { studentAnswer, modelAnswer, maxMarks };
    const resp = await axios.post(modelUrl, payload, { timeout: 30000 });
    // resp.data expected shape: { score: <number> } (0..maxMarks)
    if (resp && resp.data && typeof resp.data.score === "number") {
      const s = Math.min(Math.max(Number(resp.data.score) || 0, 0), maxMarks);
      return s;
    } else {
      console.error("evaluateTheoryWithModel: invalid response from model:", resp?.data);
      return 0;
    }
  } catch (err) {
    console.error("evaluateTheoryWithModel failed:", err.message || err);
    return 0;
  }
}

// Main evaluation: supports MCQ, THEORY (via model) and CODING (via judge)
export const evaluateExam = async ({ studentExamId, evaluatorId }) => {
  const studentExam = await StudentExam.findById(studentExamId)
    .populate({
      path: "exam",
      populate: { path: "domain", model: "Domain" },
    })
    .populate("student");
  if (!studentExam) throw new Error("StudentExam not found");

  // Deduplicate answers by questionId — last answer keeps precedence
  const rawAnswers = studentExam.answers || [];
  const answers = Object.values(
    rawAnswers.reduce((acc, curr) => {
      acc[curr.questionId] = curr;
      return acc;
    }, {})
  );

  const questions = await Question.find({
    _id: { $in: answers.map((a) => a.questionId) },
  }).lean();

  let mcqScore = 0,
      mcqTotal = 0,
      theoryScore = 0,
      theoryTotal = 0,
      codingScore = 0,
      codingTotal = 0;

  const feedback = [];

  for (const a of answers) {
    const q = questions.find((q) => q._id.toString() === a.questionId.toString());
    if (!q) continue;

    const base = {
      questionId: q._id,
      questionText: q.questionText || "",
      marksAwarded: 0,
      maxMarks: q.marks || 0,
      remarks: null,
    };
    if (isValidObjectId(evaluatorId)) base.evaluatedBy = evaluatorId;

    if (q.type === "MCQ") {
      mcqTotal++;
      const isCorrect = q.correctAnswer === a.answer;
      base.marksAwarded = isCorrect ? base.maxMarks : 0;
      if (isCorrect) mcqScore += base.marksAwarded;
    } else if (q.type === "THEORY") {
      theoryTotal++;
      // <-- use the new model-based evaluator (Gemini adapter)
      base.marksAwarded = await evaluateTheoryWithModel(
        a.answer || "",
        q.theoryAnswer || "",
        base.maxMarks
      );

      theoryScore += base.marksAwarded;

      if (base.marksAwarded === 0) {
        base.remarks = "Answer did not match model or was partially incorrect.";
      }
    } else if (q.type === "CODING") {
      // CODING auto-evaluation
      codingTotal++;
      // student answer shape for coding was stored as { code, language, lastSavedAt }
      const studentAnswer = a.answer || {};
      const code = studentAnswer.code || "";
      const language =
        studentAnswer.language ||
        q.coding?.defaultLanguage ||
        (q.coding?.allowedLanguages && q.coding.allowedLanguages[0]);

      // prepare tests (use testCases from question.coding)
      const tests = (q.coding && Array.isArray(q.coding.testCases)) ? q.coding.testCases : [];

      // Try external judge first
      let judgeResp = null;
      if (tests.length > 0) {
        judgeResp = await runCodeOnJudge({ language, code, tests, timeLimitMs: q.coding?.timeLimitMs || 2000 });
      }

      // If judgeResp null or failed, fallback to simpleLocalEvaluate (which marks 0)
      let finalResp;
      if (judgeResp && judgeResp.results) {
        finalResp = judgeResp;
      } else {
        finalResp = simpleLocalEvaluate({ code, language, tests, compareMode: q.coding?.compareMode || "trimmed" });
      }

      // compute marks: sum of testCase scores if passed
      const totalTests = Array.isArray(tests) ? tests.length : finalResp.summary?.totalCount || 0;
      const passedCount = finalResp.summary?.passedCount ?? 0;

      // If testCase objects have a per-test score property, use that
      let marksObtained = 0;
      if (Array.isArray(tests) && tests.length && tests[0] && typeof tests[0].score !== "undefined") {
        const byIndex = new Map();
        (finalResp.results || []).forEach((r) => byIndex.set(r.index, r));
        for (let idx = 0; idx < tests.length; idx++) {
          const tc = tests[idx];
          const res = byIndex.get(idx);
          if (res && res.passed) marksObtained += (tc.score || 1);
        }
      } else {
        // proportional scoring: marksAwarded = maxMarks * (passedCount / totalTests)
        marksObtained = totalTests ? (base.maxMarks * (passedCount / totalTests)) : 0;
      }

      // round to 2 decimals max
      base.marksAwarded = Math.round((marksObtained + Number.EPSILON) * 100) / 100;
      codingScore += base.marksAwarded;

      base.isCoding = true;
      base.codeLanguage = language;
      base.codeSubmitted = code;
      base.codingResult = {
        passedCount,
        totalCount: totalTests,
        details: Array.isArray(finalResp.results)
          ? finalResp.results.map((r) => ({
              testIndex: r.index,
              passed: !!r.passed,
              timeMs: r.timeMs,
              memoryMB: r.memoryMB,
              stdout: r.stdout,
              stderr: r.stderr,
            }))
          : [],
      };

      if (base.marksAwarded < base.maxMarks) {
        base.remarks = "Some test cases failed. Check output and constraints.";
      }
    }

    feedback.push(base);
  }

  const totalScore = mcqScore + theoryScore + codingScore;

  const payload = {
    studentExam: studentExamId,
    mcqScore,
    totalMcqQuestions: mcqTotal,
    theoryScore,
    totalTheoryQuestions: theoryTotal,
    theoryEvaluated: true,
    codingScore,
    totalCodingQuestions: codingTotal,
    questionFeedback: feedback,
    totalScore,
    evaluatedAt: new Date(),
  };
  if (isValidObjectId(evaluatorId)) payload.evaluatedBy = evaluatorId;

  const evaluation = await EvaluationResult.findOneAndUpdate(
    { studentExam: studentExamId },
    payload,
    { upsert: true, new: true }
  );

  // send mail (keep existing behavior)
  const domainName = studentExam.exam?.domain?.domain || "Exam";
  const paperTitle = studentExam.exam?.title || "Exam";

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: studentExam.student?.email,
    subject: `Exam Result: ${paperTitle}`,
    html: `
      <p>Hi ${studentExam.student?.name || "Student"},</p>
      <p>Your exam <strong>${paperTitle}</strong> in domain <strong>${domainName}</strong> has been evaluated.</p>
      <p>Total Score: <strong>${totalScore}</strong></p>
      <p>MCQ: ${mcqScore}/${mcqTotal}</p>
      <p>Theory: ${theoryScore}/${theoryTotal}</p>
      <p>Coding: ${codingScore}/${codingTotal}</p>
      <p>Thank you for your effort!</p>
    `,
  });

  // update StudentExam status & score (safe, non-breaking)
  try {
    let studentId = null;
    if (studentExam.student) {
      studentId =
        (typeof studentExam.student === "object" && studentExam.student._id) ||
        studentExam.student;
    }

    const updateFields = {
      status: "EVALUATED",
      score: totalScore,
    };

    if (!studentExam.submittedAt) updateFields.submittedAt = new Date();
    if (studentId && isValidObjectId(studentId)) updateFields.student = studentId;

    await StudentExam.findByIdAndUpdate(studentExamId, { $set: updateFields });
  } catch (err) {
    console.error("Failed to update StudentExam after evaluation:", err);
  }

  return evaluation;
};
