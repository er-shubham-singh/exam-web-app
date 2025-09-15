
// controllers/exam.controller.js
import CodingAttempt from "../Modal/codingAttempt.model.js";
import QuestionPaper from "../Modal/question.model.js";
import { runStudentCode } from "../Services/coding.service.js";
import {
  startExamService,
  updateAnswerService,
  submitExamService,
  getStudentSubmissionService,
  getAllSubmissionsService,
  getExamLogsService,
  getStudentExamService,
  getExamsByStudentService,
  getActiveStudentsService,
  getStudentsForMentorPageService
} from "../Services/exam.service.js";

// ---------------- STUDENT ACTIONS ----------------

// Start Exam
export const startExamController = async (req, res) => {
  try {
    const { student, exam } = req.body;
    if (!student || !exam) {
      return res.status(400).json({ success: false, message: "student and exam required" });
    }
    const result = await startExamService({ student, exam });
    res.json({ success: true, submission: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Answer
export const updateAnswerController = async (req, res) => {
  try {
    const { studentExamId, questionId, answer, runType } = req.body;
    if (!studentExamId || !questionId) {
      return res.status(400).json({ success: false, message: "studentExamId and questionId required" });
    }

    // For backwards compatibility: legacy clients send primitive answers for MCQ/THEORY
    // For coding, client should send answer: { code, language } and runType: "save" | "run"
    const payload = {
      studentExamId,
      questionId,
      answer: { ...answer, runType } // service expects runType for coding path
    };

    const result = await updateAnswerService(payload);

    // result shape:
    // - For MCQ/THEORY save: { ok: true }
    // - For coding save: { ok: true, saved: true }
    // - For coding run: { ok: true, attemptNumber, remaining, attemptId } OR { ok:false, message }
    return res.json({ success: true, submission: result });
  } catch (err) {
    console.error("updateAnswerController error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update answer" });
  }
};

// Submit Exam
export const submitExamController = async (req, res) => {
  try {
    const { studentExamId } = req.body;
    if (!studentExamId) {
      return res.status(400).json({ success: false, message: "studentExamId required" });
    }

    const { submittedExam, evaluation } = await submitExamService({ studentExamId });

    res.json({
      success: true,
      message: "Exam submitted and evaluated",
      submission: submittedExam,
      evaluation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ---------------- READ-ONLY QUERIES ----------------

// Get one student’s submission
export const getStudentSubmissionController = async (req, res) => {
  try {
    const { student, exam } = req.params;
    const result = await getStudentSubmissionService({ student, exam });
    res.json({ success: true, submission: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all submissions for an exam
export const getAllSubmissionsController = async (req, res) => {
  try {
    const { exam } = req.params;
    const result = await getAllSubmissionsService({ exam });
    res.json({ success: true, submissions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get logs of a student exam
export const getExamLogs = async (req, res) => {
  try {
    const logs = await getExamLogsService({ studentExamId: req.params.studentExamId });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get details of a single student exam
export const getStudentExam = async (req, res) => {
  try {
    const exam = await getStudentExamService({ id: req.params.id });
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all exams attempted by a student
export const getExamsByStudent = async (req, res) => {
  try {
    const exams = await getExamsByStudentService({ userId: req.params.userId });
    res.json({ success: true, exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// controllers/exam.controller.js
export const getActiveStudentsController = async (req, res) => {
  try {
    const { limit, since, eventTypes, shape = "flat" } = req.query;

    const rows = await getActiveStudentsService({ limit, since, eventTypes });
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    const students =
      shape === "flat"
        ? rows.map((r) => ({
            studentExamId: r._id,
            name: r.student?.name,
            email: r.student?.email,
            rollNumber: r.student?.rollNumber,
            examTitle: r.exam?.title,
            status: r.status,
            online: true,
            // latest N for UI
            alerts: (r.logs || []).map((l) => ({
              type: l.eventType,
              issue: l.details?.issue,
              timestamp: l.createdAt,
            })),
            // 🔴 add the true total so the badge stays correct after refresh
            alertsTotal: typeof r.logsTotal === "number" ? r.logsTotal : (r.logs || []).length,
            // (optional) handy for pagination on the client
            alertsLimit: safeLimit,
          }))
        : rows.map((r) => ({
            ...r,
            alertsTotal: r.logsTotal, // keep total in non-flat shape too
          }));

    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// controllers/exam.controller.js

export const getStudentsForMentorPageController = async (req, res) => {
  try {
    const { limit, since, eventTypes, shape = "flat" } = req.query;

    const rows = await getStudentsForMentorPageService({ limit, since, eventTypes });
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    const students =
      shape === "flat"
        ? rows.map((r) => ({
            studentExamId: r._id,
            name: r.student?.name,
            email: r.student?.email,
            rollNumber: r.student?.rollNumber,
            examTitle: r.exam?.title,
            status: r.status,
            submittedAt: r.submittedAt,
            online: r.status === "IN_PROGRESS",
            alerts: (r.logs || []).map((l) => ({
              type: l.eventType,
              issue: l.details?.issue,
              timestamp: l.createdAt,
            })),
            alertsTotal: typeof r.logsTotal === "number" ? r.logsTotal : (r.logs || []).length,
            alertsLimit: safeLimit,
          }))
        : rows.map((r) => ({
            ...r,
            alertsTotal: r.logsTotal,
          }));

    res.json({ success: true, students });
  } catch (err) {
    console.error("Mentor page error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// Run code controller 
// controllers/exam.controller.js
export const runCodeController = async (req, res) => {
  try {
    const { studentExamId } = req.params;
    const { questionId, code, language, stdin = "", mode = "evaluation" } = req.body;

    if (!studentExamId || !questionId || typeof code === "undefined") {
      return res.status(400).json({ success: false, message: "studentExamId, questionId and code are required" });
    }

    const resp = await runStudentCode({
      studentExamId,
      questionId,
      code,
      language,
      stdin,
      mode,
      runBy: req.user?._id,
    });

    return res.json(resp);
  } catch (err) {
    console.error("runCodeController error:", err);
    return res.status(500).json({ success: false, message: err.message || "Run failed" });
  }
};


// fetch coding attempt
export const getCodingAttemptsController = async (req, res) => {
  try {
    const { studentExamId, questionId } = req.query;
    if (!studentExamId || !questionId) {
      return res.status(400).json({ success: false, message: "studentExamId and questionId required" });
    }

    const attempts = await CodingAttempt.find({
      studentExam: studentExamId,
      question: questionId,
    })
      .sort({ attemptNumber: 1 })
      .lean();

    // fetch question to read maxRunAttempts (fallback to 3)
    const q = await QuestionPaper.findById(questionId).select("coding.maxRunAttempts").lean();
    const maxAttempts = (q && q.coding && Number(q.coding.maxRunAttempts)) ? Number(q.coding.maxRunAttempts) : 3;
    const used = attempts.length;
    const remaining = Math.max(0, maxAttempts - used);

    return res.json({ success: true, attempts, remaining, maxAttempts });
  } catch (err) {
    console.error("getCodingAttemptsController error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch attempts" });
  }
};