// routes/result.routes.js
import express from "express";
import { getResultByEmailAndRollController, getResultByStudentExamIdController } from "../Controller/viewResult.controller.js";


const router = express.Router();

// Public: view results by student's email + rollNumber (GET)
router.get("/results/by-identity", getResultByEmailAndRollController);

// Public: view a single result by studentExamId (GET)
router.get("/results/:studentExamId", getResultByStudentExamIdController);

export default router;
