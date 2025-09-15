

import express from "express";
import {
  startExamController,
  updateAnswerController,
  submitExamController,
  getStudentSubmissionController,
  getAllSubmissionsController,
  getExamLogs,
  getStudentExam,
  getExamsByStudent,
  getActiveStudentsController,
  getStudentsForMentorPageController,
  runCodeController,
  getCodingAttemptsController
} from "../Controller/exam.controller.js";

import { getPaperForStudent } from "../Controller/paper.controller.js";

const router = express.Router();

/* =========================
   STUDENT SIDE ROUTES
========================= */


// for student 
router.get("/student-paper", getPaperForStudent);

// Run code explicitly (for coding questions)
router.post("/studentExam/:studentExamId/code/run", runCodeController);

// Get coding run attempts (history + remaining)
router.get("/studentExam/attempts", getCodingAttemptsController);

// Start a new exam (creates StudentExam doc or resumes in-progress)
router.post("/student/start", startExamController);

// Update answer for a question
router.post("/student/answer", updateAnswerController);

// Submit exam
router.post("/student/submit", submitExamController);

// Get one student’s submission for an exam
router.get("/student/:student/:exam", getStudentSubmissionController);



/* =========================
   ADMIN SIDE ROUTES
========================= */

// Get all submissions for a specific exam
router.get("/admin/submissions/:exam", getAllSubmissionsController);

// Get logs of a particular student exam
router.get("/admin/logs/:studentExamId", getExamLogs);

// Get details of a single student exam
router.get("/admin/studentExam/:id", getStudentExam);

// Get all exams attempted by a student
router.get("/admin/examsByStudent/:userId", getExamsByStudent);

// routes/exam.routes.js
router.get("/admin/active-students", getActiveStudentsController);


router.get("/admin/get-student-paper-submission-log", getStudentsForMentorPageController)

export default router;
