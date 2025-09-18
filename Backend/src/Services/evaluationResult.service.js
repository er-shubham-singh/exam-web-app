
// services/evaluation.service.js
import mongoose from "mongoose";
import StudentExam from "../Modal/stuedntExam.modal.js";
import Question from "../Modal/question.model.js";
import EvaluationResult from "../Modal/evaluationResult.modal.js";
import transporter from "../Config/email.config.js";
import axios from "axios";
import CodingAttempt from "../Modal/codingAttempt.model.js";
import { evaluateTheory } from "../Config/ai.theory.config.js";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

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

// export async function evaluateTheoryWithModel(studentAnswer, modelAnswer, maxMarks = 5) {
//   const modelUrl = process.env.GEMINI_API_URL;
//   if (!modelUrl) {
//     console.warn("GEMINI_API_URL not configured — falling back to 0 for theory evaluation.");
//     return 0;
//   }

//   try {
//     const payload = { studentAnswer, modelAnswer, maxMarks };
//     const resp = await axios.post(modelUrl, payload, { timeout: 30000 });
//     // resp.data expected shape: { score: <number> } (0..maxMarks)
//     if (resp && resp.data && typeof resp.data.score === "number") {
//       const s = Math.min(Math.max(Number(resp.data.score) || 0, 0), maxMarks);
//       return s;
//     } else {
//       console.error("evaluateTheoryWithModel: invalid response from model:", resp?.data);
//       return 0;
//     }
//   } catch (err) {
//     console.error("evaluateTheoryWithModel failed:", err.message || err);
//     return 0;
//   }
// }

export async function evaluateTheoryWithModel(studentAnswer, modelAnswer, maxMarks = 5) {
  const { marks, similarity } = await evaluateTheory(studentAnswer, modelAnswer, maxMarks);
  return { marks, similarity };
}

export const evaluateExam = async ({ studentExamId, evaluatorId }) => {
  const studentExam = await StudentExam.findById(studentExamId)
    .populate({
      path: "exam",
      populate: { path: "domain", model: "Domain" },
    })
    .populate("student");
  if (!studentExam) throw new Error("StudentExam not found");

  console.info(`[Eval] Starting evaluation for studentExam=${studentExamId} student=${studentExam.student?.email || studentExam.student}`);

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

  // local safe number helper (keeps this function self-contained)
  const toNumberSafe = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

  let mcqScore = 0,
      mcqTotal = 0,
      theoryScore = 0,
      theoryTotal = 0,
      codingScore = 0,
      codingTotal = 0;

  const feedback = [];

  for (const a of answers) {
    const q = questions.find((q) => q._id.toString() === a.questionId.toString());
    if (!q) {
      console.warn(`[Eval] Answer skipped: question doc not found for questionId=${a.questionId}`);
      continue;
    }

    const base = {
      questionId: q._id,
      questionText: q.questionText || "",
      marksAwarded: 0,
      maxMarks: q.marks || 0,
      remarks: null,
    };
    if (isValidObjectId(evaluatorId)) base.evaluatedBy = evaluatorId;

    const qType = (q.type || "").toString().toUpperCase();

    // Basic per-question log (always)
    console.info(`\n[Eval][QUESTION] id=${q._id} type=${qType} maxMarks=${base.maxMarks}`);
    console.info(`[Eval][QUESTION] text="${(q.questionText || "").slice(0, 200)}"`);
    console.info(`[Eval][QUESTION] studentAnswerRaw="${JSON.stringify(a.answer)}"`);

    // --- MCQ ---
  // --- MCQ ---
if (qType === "MCQ") {
  mcqTotal++;

  const correctRaw = q.correctAnswer;
  const options = Array.isArray(q.options) ? q.options : [];

  const indexToLetter = (i) => String.fromCharCode(65 + Number(i)); // 0 -> 'A'

  const studentRaw = a.answer;

  // Improved normalizer: handles object answers, JSON strings and option objects
  function normalize(value) {
    if (value === null || value === undefined) return "";

    // If value is an object, try to extract a useful primitive:
    if (typeof value === "object") {
      // common keys we might find
      const preferredKeys = ["answer", "value", "selected", "option", "0", "choice"];
      for (const k of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(value, k) && value[k] != null) {
          // recursively normalize the extracted value
          return normalize(value[k]);
        }
      }
      // if options are strings or objects, maybe object maps index->letter
      // try to find first primitive property
      for (const k of Object.keys(value)) {
        const v = value[k];
        if (v == null) continue;
        if (typeof v === "string" || typeof v === "number") return normalize(v);
      }
      // fallback: JSON stringify (so it won't become "[OBJECT OBJECT]")
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value).toUpperCase();
      }
    } // end object handling

    // if it's a string that looks like JSON, try parse
    if (typeof value === "string") {
      const trimmed = value.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const parsed = JSON.parse(trimmed);
          return normalize(parsed);
        } catch (e) {
          // not JSON, continue
        }
      }

      // now treat as primitive string
      // if single letter A..Z
      if (/^[A-Za-z]$/.test(trimmed)) return trimmed.toUpperCase();

      // numeric index string
      if (/^\d+$/.test(trimmed)) {
        const idx = Number(trimmed);
        if (idx >= 0 && idx < options.length) return indexToLetter(idx);
        if (idx >= 1 && idx <= options.length) return indexToLetter(idx - 1);
      }

      // compare to option text if options may include objects
      const foundIdx = options.findIndex((opt) => {
        if (opt == null) return false;
        if (typeof opt === "object") {
          // common option shape { value: 'A', text: 'useRef' } or { key:..., text:... }
          const optText = opt.text ?? opt.label ?? opt.value ?? JSON.stringify(opt);
          return String(optText).trim() === trimmed;
        }
        return String(opt).trim() === trimmed;
      });
      if (foundIdx !== -1) return indexToLetter(foundIdx);

      // last resort return uppercased trimmed string
      return trimmed.toUpperCase();
    }

    // numbers
    if (typeof value === "number") {
      const idx = Number(value);
      if (idx >= 0 && idx < options.length) return indexToLetter(idx);
      if (idx >= 1 && idx <= options.length) return indexToLetter(idx - 1);
      return String(value).toUpperCase();
    }

    // fallback
    return String(value).toUpperCase();
  } // end normalize

  const correctNorm = normalize(correctRaw);
  const studentNorm = normalize(studentRaw);

  const isCorrect = correctNorm && studentNorm && correctNorm === studentNorm;
  base.marksAwarded = isCorrect ? base.maxMarks : 0;
  if (isCorrect) mcqScore += base.marksAwarded;

  console.info(`[Eval][MCQ] correctRaw="${String(correctRaw)}" correctNorm="${correctNorm}" studentRaw="${JSON.stringify(studentRaw)}" studentNorm="${studentNorm}" isCorrect=${isCorrect} awarded=${base.marksAwarded}/${base.maxMarks}`);
  if (!isCorrect && process.env.DEBUG_EVAL === "true") {
    console.debug(`[Eval][MCQ][DEBUG] Options=${JSON.stringify(options)}`);
  }
}


// --- THEORY ---
else if (qType === "THEORY") {
  theoryTotal++;

  // call evaluator
  const result = await evaluateTheoryWithModel(
    a.answer || "",
    q.theoryAnswer || "",
    base.maxMarks
  );

  // LOG raw result to help debug WHY similarity is zero
  console.info(`[Eval][THEORY][RAW_RESULT] qId=${q._id} rawResult=${JSON.stringify(result)}`);

  // support multiple return shapes: {marks, similarity} | {score, sim} | number
  let marks = 0;
  let similarity = 0;
  if (result && typeof result === "object") {
    marks = toNumberSafe(result.marks ?? result.score ?? 0);
    similarity = toNumberSafe(result.similarity ?? result.sim ?? 0);
  } else if (typeof result === "number") {
    marks = toNumberSafe(result);
  }

  base.marksAwarded = Math.round((marks + Number.EPSILON) * 100) / 100;
  if (similarity) base.similarity = Math.round((similarity + Number.EPSILON) * 10000) / 10000;
  theoryScore += base.marksAwarded;

  console.info(`[Eval][THEORY] awarded=${base.marksAwarded}/${base.maxMarks} similarity=${base.similarity ?? 0}`);

  // extra hint if similarity is zero (useful)
  if ((base.similarity === 0 || base.marksAwarded === 0) && process.env.DEBUG_THEORY_EVAL === "true") {
    console.warn(`[Eval][THEORY][HINT] similarity or marks are zero. Check HF logs for embedding errors/timeouts. Ensure HF_API_KEY is set and HF endpoint is reachable.`);
  }

  if (base.marksAwarded === 0 && !base.remarks) {
    base.remarks = "Answer did not match model or was partially incorrect.";
  }
}


    // --- CODING ---
    else if (qType === "CODING") {
      codingTotal++;
      const studentAnswer = a.answer || {};
      const code = studentAnswer.code || "";
      const language =
        studentAnswer.language ||
        q.coding?.defaultLanguage ||
        (q.coding?.allowedLanguages && q.coding.allowedLanguages[0]);

      const tests = (q.coding && Array.isArray(q.coding.testCases)) ? q.coding.testCases : [];

      let judgeResp = null;
      if (tests.length > 0) {
        judgeResp = await runCodeOnJudge({ language, code, tests, timeLimitMs: q.coding?.timeLimitMs || 2000 });
      }

      let finalResp;
      if (judgeResp && judgeResp.results) {
        finalResp = judgeResp;
      } else {
        finalResp = simpleLocalEvaluate({ code, language, tests, compareMode: q.coding?.compareMode || "trimmed" });
      }

      const totalTests = Array.isArray(tests) ? tests.length : finalResp.summary?.totalCount || 0;
      const passedCount = finalResp.summary?.passedCount ?? 0;

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
        marksObtained = totalTests ? (base.maxMarks * (passedCount / totalTests)) : 0;
      }

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

      console.info(`[Eval][CODING] passed=${passedCount}/${totalTests} awarded=${base.marksAwarded}/${base.maxMarks}`);
      if (base.marksAwarded < base.maxMarks) {
        base.remarks = base.remarks || "Some test cases failed. Check output and constraints.";
      }
    }

    // push feedback and continue
    feedback.push(base);
  } // end for answers

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

  try {
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
  } catch (mailErr) {
    console.error("Failed to send evaluation email:", mailErr);
  }

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

  console.info(`[Eval] Completed evaluation for studentExam=${studentExamId} totalScore=${totalScore}`);

  return evaluation;
};

