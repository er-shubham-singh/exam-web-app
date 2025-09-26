// src/Services/result.service.js
import Student from "../Modal/user.modal.js";
import StudentExam from "../Modal/stuedntExam.modal.js";
import EvaluationResult from "../Modal/evaluationResult.modal.js";
import mongoose from "mongoose";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

function buildResultView(evaluationDoc) {
  if (!evaluationDoc) return null;
  const studentExam = evaluationDoc.studentExam || {};
  const student = studentExam.student || {};

  // Normalize questionFeedback ids to string for easier matching on frontend
  const qFeedback = (evaluationDoc.questionFeedback || []).map((qf) => ({
    questionId: (qf.questionId && qf.questionId._id) ? String(qf.questionId._id) : String(qf.questionId || ""),
    questionText: qf.questionText || (qf.questionId && qf.questionId.questionText) || "",
    marksAwarded: qf.marksAwarded ?? 0,
    maxMarks: qf.maxMarks ?? 0,
    remarks: qf.remarks || null,
  }));

  // Get attempted answers from studentExam.answers if available
  const attemptedAnswers = (studentExam.answers || []).map((a) => ({
    questionId: String(a.questionId),
    answer: a.answer ?? null,
    isCorrect: typeof a.isCorrect === "boolean" ? a.isCorrect : null, // optional
  }));

  return {
    evaluationId: String(evaluationDoc._id),
    studentExamId: String(studentExam._id),
    student: {
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email,
    },
    exam: {
      id: studentExam.exam?._id ? String(studentExam.exam._id) : null,
      title: studentExam.exam?.title || null,
      domain: studentExam.exam?.domain?.domain || studentExam.exam?.domain || null,
      totalMarks: studentExam.exam?.totalMarks ?? null,
    },
    scores: {
      mcqScore: evaluationDoc.mcqScore ?? 0,
      totalMcqQuestions: evaluationDoc.totalMcqQuestions ?? 0,
      theoryScore: evaluationDoc.theoryScore ?? 0,
      totalTheoryQuestions: evaluationDoc.totalTheoryQuestions ?? 0,
        codingScore: evaluationDoc.codingScore ?? 0,                // add this
  totalCodingQuestions: evaluationDoc.totalCodingQuestions ?? 0, // add this
      totalScore: evaluationDoc.totalScore ?? 0,
    },
    evaluatedAt: evaluationDoc.evaluatedAt || evaluationDoc.updatedAt || evaluationDoc.createdAt,
    evaluatedBy: evaluationDoc.evaluatedBy || null,
    questionFeedback: qFeedback,
    attemptedAnswers, // <-- new: array of { questionId, answer, isCorrect }
  };
}

// src/Services/result.service.js (replace the function)
export async function getResultsByEmailAndRoll(email, rollNumber, options = {}) {
  if (!email || !rollNumber) throw new Error("email and rollNumber required");

  const rawEmail = String(email).trim();
  const rawRoll = String(rollNumber).trim();
  console.log("[getResultsByEmailAndRoll] Searching:", rawEmail, rawRoll);

  // tolerant email regex
  const emailRegex = { $regex: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") };

  // build roll variations
  const rollCandidates = [rawRoll];
  const numeric = Number(rawRoll);
  if (!Number.isNaN(numeric)) rollCandidates.push(numeric);

  // try to find student first
  const student = await Student.findOne({
    email: emailRegex,
    $or: rollCandidates.map(r => ({ rollNumber: r }))
  }).lean();

  console.log("[getResultsByEmailAndRoll] student found:", !!student, student?._id);

  let studentExamIds = [];

  if (student) {
    // primary: evaluated exams
    const evaluated = await StudentExam.find({ student: student._id, status: "EVALUATED" }).select("_id").lean();
    console.log("[getResultsByEmailAndRoll] evaluated studentExams count:", evaluated.length);
    if (evaluated.length) studentExamIds = evaluated.map(s => s._id);
    else {
      // fallback: any studentExams
      const anySE = await StudentExam.find({ student: student._id }).select("_id").lean();
      console.log("[getResultsByEmailAndRoll] fallback any studentExams count:", anySE.length);
      if (anySE.length) studentExamIds = anySE.map(s => s._id);
    }
  }

  // If we didn't find studentExam ids via student lookup, we'll use aggregation fallback later.
  // But even if we did find studentExamIds, it's possible EvaluationResult documents are linked to other StudentExam ids
  // (status mismatch or duplicates). So we'll attempt multiple lookups and merge results.
  const foundEvalDocs = [];

  // Helper to populate evaluation docs (query by ids)
  const fetchAndPushByEvalIds = async (evalIds) => {
    if (!evalIds || !evalIds.length) return;
    let q = EvaluationResult.find({ _id: { $in: evalIds } })
      .populate({
        path: "studentExam",
        populate: [
          { path: "student", select: "name rollNumber email" },
          { path: "exam", select: "title domain totalMarks" }
        ]
      })
      .populate({
        path: "questionFeedback.questionId",
        select: "questionText"
      })
      .sort({ evaluatedAt: -1, updatedAt: -1 });

    if (options.limit) q.limit(parseInt(options.limit, 10));
    if (options.skip) q.skip(parseInt(options.skip, 10));
    const docs = await q.lean();
    if (docs && docs.length) {
      for (const d of docs) foundEvalDocs.push(d);
    }
  };

  try {
    // First attempt: if we have studentExamIds, fetch EvaluationResults whose studentExam is in that set
    if (studentExamIds.length) {
      console.info("[getResultsByEmailAndRoll] Attempting direct EvaluationResult lookup by studentExamIds:", studentExamIds.map(String).slice(0, 20));
      // direct query
      await fetchAndPushByEvalIds(
        (await EvaluationResult.find({ studentExam: { $in: studentExamIds } }).select("_id").lean()).map(d => d._id)
      );

      console.info(`[getResultsByEmailAndRoll] direct lookup results count=${foundEvalDocs.length}`);
    }

    // Second attempt: if no results yet, try a string-id fallback (some legacy docs might store as string)
    if (!foundEvalDocs.length && studentExamIds.length) {
      try {
        const stringIds = studentExamIds.map(id => String(id));
        console.info("[getResultsByEmailAndRoll] Trying string-id fallback for studentExam ids:", stringIds.slice(0, 20));
        await fetchAndPushByEvalIds(
          (await EvaluationResult.find({ studentExam: { $in: stringIds } }).select("_id").lean()).map(d => d._id)
        );
        console.info(`[getResultsByEmailAndRoll] string-id fallback results count=${foundEvalDocs.length}`);
      } catch (err) {
        console.warn("[getResultsByEmailAndRoll] string-id fallback error:", err && err.stack ? err.stack : err);
      }
    }

    // Third attempt: aggregation fallback to find EvaluationResult -> StudentExam -> Student (match by student._id OR by email/roll)
    if (!foundEvalDocs.length) {
      console.info("[getResultsByEmailAndRoll] Running aggregation fallback (evaluationresults -> studentexams -> users)");
      const matchEmailRegex = { $regex: new RegExp(rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") };

      // if we have a student doc, prefer a direct match on student._id in aggregation, otherwise fallback to email/roll match
      const matchConditions = student
        ? [{ "se.student": student._id }]
        : [
            { "se.studentDoc.email": matchEmailRegex },
            { "se.studentDoc.rollNumber": rawRoll },
            { "se.studentDoc.rollNumber": numeric }
          ];

      // perform aggregation
      const matches = await EvaluationResult.aggregate([
        { $lookup: { from: "studentexams", localField: "studentExam", foreignField: "_id", as: "se" } },
        { $unwind: { path: "$se", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "se.student", foreignField: "_id", as: "se.studentDoc" } },
        { $unwind: { path: "$se.studentDoc", preserveNullAndEmptyArrays: true } },
        { $match: { $or: matchConditions } },
        { $project: { _id: 1 } },
        { $sort: { _id: -1 } }
      ]);

      if (matches && matches.length) {
        const evalIds = matches.map(m => m._id);
        console.info("[getResultsByEmailAndRoll] aggregation fallback matched evalIds sample:", evalIds.slice(0, 10));
        await fetchAndPushByEvalIds(evalIds);
        console.info(`[getResultsByEmailAndRoll] aggregation fallback fetched docs count=${foundEvalDocs.length}`);
      } else {
        console.info("[getResultsByEmailAndRoll] aggregation fallback found none.");
      }
    }

    // As a final safety net: if we still have nothing, try searching evaluationresults by studentExam that belongs to the student
    // (join studentexams on se._id then query EvaluationResult for those se._id list)
    if (!foundEvalDocs.length && student) {
      console.info("[getResultsByEmailAndRoll] Final join fallback: fetch studentExam ids for student and search evaluationresults by those ids");
      const seIds = (await StudentExam.find({ student: student._id }).select("_id").lean()).map(s => s._id);
      if (seIds.length) {
        console.info("[getResultsByEmailAndRoll] student has seIds count:", seIds.length);
        await fetchAndPushByEvalIds(
          (await EvaluationResult.find({ studentExam: { $in: seIds } }).select("_id").lean()).map(d => d._id)
        );
        console.info(`[getResultsByEmailAndRoll] final join fallback results count=${foundEvalDocs.length}`);
      }
    }

    // dedupe evaluations by _id and return
    const uniq = [];
    const seen = new Set();
    for (const d of foundEvalDocs) {
      const sid = String(d._id);
      if (!seen.has(sid)) {
        seen.add(sid);
        uniq.push(d);
      }
    }

    console.log("[getResultsByEmailAndRoll] total evaluations found after all fallbacks:", uniq.length);
    if (!uniq.length) return [];

    // apply limit/skip on returned items (we already applied on individual queries, but ensure final)
    const finalDocs = uniq.slice(options.skip ? parseInt(options.skip, 10) : 0, (options.limit ? parseInt(options.limit, 10) : uniq.length) + (options.skip ? parseInt(options.skip, 10) : 0));
    return finalDocs.map(buildResultView);

  } catch (err) {
    console.error("[getResultsByEmailAndRoll] ERROR", err && err.stack ? err.stack : err);
    throw err;
  }
}





export async function getResultByStudentExamId(studentExamId) {
  if (!isValidObjectId(studentExamId)) throw new Error("Invalid studentExamId");

  const evaluation = await EvaluationResult.findOne({ studentExam: studentExamId })
    .populate({
      path: "studentExam",
      populate: [
        { path: "student", select: "name rollNumber email" },
        { path: "exam", select: "title domain totalMarks" },
      ],
    })
    .populate({
      path: "questionFeedback.questionId",
      select: "questionText",
    })
    .lean();

  return buildResultView(evaluation);
}
