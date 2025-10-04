
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
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// inside services/evaluation.service.js (top imports)
import { runCodeOnJudge as pistonRunCodeOnJudge } from "./codeRunner.service.js"; // <-- new

// replace the old runCodeOnJudge function with this:
async function runCodeOnJudge({ language, code, tests = [], timeLimitMs = 2000 }) {
  const runnerUrl = process.env.CODE_RUNNER_URL;
  if (runnerUrl) {
    try {
      const payload = { language, code, tests, timeLimitMs };
      const resp = await axios.post(runnerUrl, payload, { timeout: 30000 });
      if (resp && resp.data) return resp.data;
    } catch (err) {
      console.error("External CODE_RUNNER_URL failed:", err.message || err);
      // fall through to piston-based runner
    }
  }

  // fallback to Piston wrapper implemented earlier
  try {
    const resp = await pistonRunCodeOnJudge({ language, code, tests, timeLimitMs });
    return resp;
  } catch (err) {
    console.error("Fallback pistonRunCodeOnJudge failed:", err && err.message ? err.message : err);
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
// --- CODING (replace existing block) ---
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

  // ------------------- scoring -------------------
  let marksObtained = 0;

  // detect if tests have per-test 'score' property (legacy weighted tests)
  const testsHaveScores = Array.isArray(tests) && tests.length && typeof tests[0]?.score !== "undefined";

  if (testsHaveScores) {
    // total weight (sum of all test scores as defined in DB)
    const totalScoreWeight = tests.reduce((s, tc) => s + (Number(tc.score) || 0), 0);

    // map results by index so we can check which tests passed
    const resultByIndex = new Map();
    (finalResp.results || []).forEach((r) => {
      // r.index might be string or number, normalize to number
      const idx = typeof r.index === "number" ? r.index : Number(r.index);
      resultByIndex.set(idx, r);
    });

    // sum weights for passed tests
    let passedWeight = 0;
    for (let idx = 0; idx < tests.length; idx++) {
      const tc = tests[idx];
      const res = resultByIndex.get(idx);
      if (res && res.passed) {
        passedWeight += (Number(tc.score) || 0);
      }
    }

    if (totalScoreWeight > 0) {
      // scale passedWeight to question's max marks
      marksObtained = (passedWeight / totalScoreWeight) * (base.maxMarks || 0);
    } else {
      // fallback to simple proportion of tests (should be rare)
      marksObtained = totalTests ? (base.maxMarks * (passedCount / totalTests)) : 0;
    }
  } else {
    // no per-test weights -> simple proportional scoring
    marksObtained = totalTests ? (base.maxMarks * (passedCount / totalTests)) : 0;
  }

  // round to 2 decimal places
  base.marksAwarded = Math.round((marksObtained + Number.EPSILON) * 100) / 100;
  codingScore += base.marksAwarded;
  // ----------------- end scoring ------------------

  base.isCoding = true;
  base.codeLanguage = language;
  base.codeSubmitted = code;
  base.codingResult = {
    passedCount,
    totalCount: totalTests,
    details: Array.isArray(finalResp.results)
      ? finalResp.results.map((r) => ({
          testIndex: typeof r.index === "number" ? r.index : Number(r.index),
          passed: !!r.passed,
          timeMs: r.timeMs ?? r.time ?? 0,
          memoryMB: r.memoryMB ?? r.memory ?? 0,
          stdout: r.stdout ?? "",
          stderr: r.stderr ?? "",
        }))
      : [],
  };

  console.info(`[Eval][CODING][judgeResp] qId=${q._id} studentExam=${studentExamId} summary=${JSON.stringify(judgeResp?.summary)}`);
  if (process.env.DEBUG_EVAL === "true") console.debug(`[Eval][CODING][judgeResp-full] ${JSON.stringify(judgeResp)}`);

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
  const fromEmail = process.env.SMTP_USER?.trim();              // ✅ correct env
  const fromName  = process.env.SMTP_FROM_NAME?.trim() || "Exam Portal";
  const replyTo   = process.env.REPLY_TO_EMAIL?.trim() || fromEmail;

  const to = studentExam?.student?.email?.trim();
  const studentName = studentExam?.student?.name || "Student";

  console.log(`📨 Sending result mail to ${to}...`);
  console.log(`From: ${fromName} <${fromEmail}>`);
  console.log(`Reply-To: ${replyTo}`);

  if (!fromEmail || !fromEmail.includes("@")) {
    throw new Error("SMTP_USER must be a valid email address.");
  }
  if (!to || !to.includes("@")) {
    throw new Error("Recipient email is missing or invalid.");
  }

  // Safe defaults to avoid "undefined" in the email body
  const safe = (v, def = 0) => (typeof v === "number" ? v : (v ?? def));
  const _mcqScore   = safe(mcqScore);
  const _mcqTotal   = safe(mcqTotal);
  const _theoryScore= safe(theoryScore);
  const _theoryTotal= safe(theoryTotal);
  const _codingScore= safe(codingScore);
  const _codingTotal= safe(codingTotal);
  const _totalScore = safe(totalScore);

  const subject = `Exam Result • ${paperTitle} (${domainName})`;

  // Plain-text fallback
  const text = `Hi ${studentName},

Your exam "${paperTitle}" in "${domainName}" has been evaluated.

Total Score: ${_totalScore}
MCQ:   ${_mcqScore}/${_mcqTotal}
Theory:${_theoryScore}/${_theoryTotal}
Coding:${_codingScore}/${_codingTotal}

Thank you for your effort!
`;

  // Simple, clean HTML
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
      <p>Hi ${escapeHtml(studentName)},</p>
      <p>Your exam <strong>${escapeHtml(paperTitle)}</strong> in domain <strong>${escapeHtml(domainName)}</strong> has been evaluated.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:520px">
        <tr>
          <td style="padding:10px 12px;background:#0ea5e9;color:#fff;font-weight:700;border-radius:8px 8px 0 0">Total Score</td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <div style="font-size:18px;font-weight:700">${_totalScore}</div>
            <div style="margin-top:8px">
              <div>MCQ: <strong>${_mcqScore}</strong> / ${_mcqTotal}</div>
              <div>Theory: <strong>${_theoryScore}</strong> / ${_theoryTotal}</div>
              <div>Coding: <strong>${_codingScore}</strong> / ${_codingTotal}</div>
            </div>
          </td>
        </tr>
      </table>

      <p style="margin-top:16px">Thank you for your effort!</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">
        This email was sent by ${escapeHtml(fromName)}.
        If you have questions, reply to <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    replyTo,
    subject,
    text,
    html,
    // Keep it simple for Gmail; no Brevo headers
    // headers: { },
  });

  console.log("✅ Result email sent", {
    messageId: info?.messageId,
    accepted: info?.accepted,
    rejected: info?.rejected,
    response: info?.response,
  });

}catch (mailErr) {
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

