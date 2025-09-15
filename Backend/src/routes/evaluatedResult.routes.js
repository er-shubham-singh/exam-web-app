import express from "express"
import { getStudentHistory, studentSubmitAndEvaluate } from "../Controller/evaluationResult.controller.js";

const router = express.Router();

router.post(
  "/evaluate/:studentExamId",
  studentSubmitAndEvaluate
);

router.get(
  "/admin/student-history",
  getStudentHistory
);

export default router