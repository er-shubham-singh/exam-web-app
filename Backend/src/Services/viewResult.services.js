// src/Services/result.service.js
import Student from "../Modal/user.modal.js";
import StudentExam from "../Modal/stuedntExam.modal.js";
import EvaluationResult from "../Modal/evaluationResult.modal.js";
import mongoose from "mongoose";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

// function buildResultView(evaluationDoc) {
//   if (!evaluationDoc) return null;
//   const studentExam = evaluationDoc.studentExam || {};
//   const student = studentExam.student || {};

//   return {
//     evaluationId: evaluationDoc._id,
//     studentExamId: studentExam._id,
//     student: {
//       name: student.name,
//       rollNumber: student.rollNumber,
//       email: student.email,
//     },
//     exam: {
//       id: studentExam.exam?._id,
//       title: studentExam.exam?.title || null,
//       domain: studentExam.exam?.domain?.domain || studentExam.exam?.domain || null,
//       totalMarks: studentExam.exam?.totalMarks ?? null,
//     },
//     scores: {
//       mcqScore: evaluationDoc.mcqScore ?? 0,
//       totalMcqQuestions: evaluationDoc.totalMcqQuestions ?? 0,
//       theoryScore: evaluationDoc.theoryScore ?? 0,
//       totalTheoryQuestions: evaluationDoc.totalTheoryQuestions ?? 0,
//       totalScore: evaluationDoc.totalScore ?? 0,
//     },
//     evaluatedAt: evaluationDoc.evaluatedAt || evaluationDoc.updatedAt || evaluationDoc.createdAt,
//     evaluatedBy: evaluationDoc.evaluatedBy || null,
//     questionFeedback: (evaluationDoc.questionFeedback || []).map((qf) => ({
//       questionId: qf.questionId?._id || qf.questionId,
//       questionText: qf.questionText || qf.questionId?.questionText || "",
//       marksAwarded: qf.marksAwarded ?? 0,
//       maxMarks: qf.maxMarks ?? 0,
//       remarks: qf.remarks || null,
//     })),
//   };
// }

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
      totalScore: evaluationDoc.totalScore ?? 0,
    },
    evaluatedAt: evaluationDoc.evaluatedAt || evaluationDoc.updatedAt || evaluationDoc.createdAt,
    evaluatedBy: evaluationDoc.evaluatedBy || null,
    questionFeedback: qFeedback,
    attemptedAnswers, // <-- new: array of { questionId, answer, isCorrect }
  };
}


/**
 * Fetch evaluated results for a student by email + rollNumber.
 * Tries multiple fallbacks so students don't need manual DB fixes.
 */
export async function getResultsByEmailAndRoll(email, rollNumber, options = {}) {
  if (!email || !rollNumber) throw new Error("email and rollNumber required");

  console.log("[getResultsByEmailAndRoll] Searching:", email, rollNumber);

  const emailRegex = { $regex: new RegExp(`^${email.trim()}$`, "i") };
  const numeric = Number(rollNumber);
  const orRolls = [{ rollNumber: rollNumber }, { rollNumber: `${rollNumber}` }];

  if (!Number.isNaN(numeric)) orRolls.push({ rollNumber: numeric });

  const student = await Student.findOne({
    email: emailRegex,
    $or: orRolls,
  }).lean();

  console.log("[getResultsByEmailAndRoll] student found:", !!student, student?._id);
  if (!student) return [];

  // 1) Preferred path: only EVALUATED studentExams
  let studentExams = await StudentExam.find({
    student: student._id,
    status: "EVALUATED",
  }).select("_id").lean();

  console.log("[getResultsByEmailAndRoll] evaluated studentExams count:", studentExams.length);

  // 2) Fallback #1: any StudentExam for this student (ignore status)
  if (!studentExams.length) {
    studentExams = await StudentExam.find({
      student: student._id,
    }).select("_id").lean();

    console.log("[getResultsByEmailAndRoll] fallback -> any studentExams count:", studentExams.length);
  }

  // 3) If still no studentExams, fallback #2: find evaluationresults whose linked studentExam has student === this student._id
  //    (use aggregation to join evaluationresults -> studentexams -> match se.student)
  if (!studentExams.length) {
    console.log("[getResultsByEmailAndRoll] fallback #2 -> scanning EvaluationResult -> StudentExam join");
    const matches = await EvaluationResult.aggregate([
      {
        $lookup: {
          from: "studentexams",
          localField: "studentExam",
          foreignField: "_id",
          as: "se",
        },
      },
      { $unwind: { path: "$se", preserveNullAndEmptyArrays: true } },
      { $match: { "se.student": student._id } },
      { $project: { _id: 1 } }, // return evaluationresult ids
      { $sort: { _id: -1 } },
      // limit can be applied here if options.limit exists; we'll apply after fetching
    ]);

    const evalIds = matches.map((m) => m._id);
    if (!evalIds.length) {
      console.log("[getResultsByEmailAndRoll] fallback #2 found no evaluationresults linked to this student's studentExams");
      return [];
    }

    // Fetch those evaluation documents with the proper populates
    let evalQuery = EvaluationResult.find({ _id: { $in: evalIds } })
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
      .sort({ evaluatedAt: -1, updatedAt: -1 });

    if (options.limit) evalQuery.limit(parseInt(options.limit, 10));
    if (options.skip) evalQuery.skip(parseInt(options.skip, 10));

    const evaluations = await evalQuery.lean();
    console.log("[getResultsByEmailAndRoll] fallback #2 evaluations:", evaluations.length);
    return evaluations.map(buildResultView);
  }

  // If we got studentExam ids from path 1 or fallback 1, fetch EvaluationResult for those studentExam ids
  const ids = studentExams.map((s) => s._id);

  let query = EvaluationResult.find({ studentExam: { $in: ids } })
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
    .sort({ evaluatedAt: -1, updatedAt: -1 });

  if (options.limit) query.limit(parseInt(options.limit, 10));
  if (options.skip) query.skip(parseInt(options.skip, 10));

  const evaluations = await query.lean();
  console.log("[getResultsByEmailAndRoll] evaluations:", evaluations.length);
  return evaluations.map(buildResultView);
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
