// controllers/evaluation.controller.js
import { evaluateExam } from "../Services/evaluationResult.service.js";
import EvaluationResult from "../Modal/evaluationResult.modal.js";
import StudentExam from "../Modal/stuedntExam.modal.js";

export const studentSubmitAndEvaluate = async (req, res) => {
  try {
    const evaluatorId = req.user?._id;
    const evaluation = await evaluateExam({
      studentExamId: req.params.studentExamId,
      evaluatorId,
    });
    res.json({ success: true, evaluation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getStudentHistory = async (req, res) => {
  try {
    const examQuery = {};

    if (req.query.studentId) examQuery.student = req.query.studentId;
    if (req.query.paperId) examQuery.exam = req.query.paperId;
    if (req.query.from || req.query.to) {
      examQuery.createdAt = {};
      if (req.query.from) examQuery.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) examQuery.createdAt.$lte = new Date(req.query.to);
    }

    // Step 1: Get matching studentExamIds
    const studentExams = await StudentExam.find(examQuery).select('_id');
    const studentExamIds = studentExams.map(se => se._id);

    // Step 2: Fetch evaluations for those student exams, populate question text
    const history = await EvaluationResult.find({ studentExam: { $in: studentExamIds } })
      .populate({
        path: "studentExam",
        populate: [
          { path: "student", select: "name rollNumber email" },
          { path: "exam", select: "title domain totalMarks" },
        ],
      })
      .populate({
        path: "questionFeedback.questionId",  // <-- populate question details here
        select: "questionText"                // select the questionText field
      })
      .lean();

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
