// controllers/result.controller.js
import {
  getResultsByEmailAndRoll,
  getResultByStudentExamId,
} from "../Services/viewResult.services.js";

/**
 * Public endpoint: GET /api/results/by-identity?email=...&rollNumber=...
 * Returns an array (possibly empty) of results for that student.
 */
export const getResultByEmailAndRollController = async (req, res) => {
  try {
    const { email, rollNumber, limit, skip } = req.query;
    if (!email || !rollNumber) {
      return res.status(400).json({ success: false, error: "email and rollNumber are required" });
    }

    const options = {};
    if (limit) options.limit = limit;
    if (skip) options.skip = skip;

    const results = await getResultsByEmailAndRoll(email, rollNumber, options);
    if (!results.length) {
      return res.status(404).json({ success: true, results: [], message: "No evaluated results found for given email and roll number." });
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error("getResultByEmailAndRollController:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Public endpoint: GET /api/results/:studentExamId
 * Returns a single evaluation view for the provided studentExamId.
 */
export const getResultByStudentExamIdController = async (req, res) => {
  try {
    const { studentExamId } = req.params;
    if (!studentExamId) return res.status(400).json({ success: false, error: "studentExamId required" });

    const result = await getResultByStudentExamId(studentExamId);
    if (!result) return res.status(404).json({ success: false, error: "Result not found or not evaluated yet" });

    return res.json({ success: true, result });
  } catch (err) {
    console.error("getResultByStudentExamIdController:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
