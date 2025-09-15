
// controllers/question.controller.js
import * as questionService from "../Services/question.services.js";

// ✅ Create a new question -> message: <question object>
export const createQuestion = async (req, res) => {
  try {
    const question = await questionService.createQuestionService(req.body);
    res.status(201).json({ success: true, message: question });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Get all questions (supports optional filters via query)
export const getAllQuestions = async (req, res) => {
  try {
    // pass everything to service (e.g., ?category=&domain=&page=&limit=&sort=)
    const questions = await questionService.getAllQuestionService(req.query);
    res.status(200).json({ success: true, message: questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get a single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const question = await questionService.getQuestionByIdService(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, message: question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update a question
export const updateQuestion = async (req, res) => {
  try {
    const updated = await questionService.updateQuestionService(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, message: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Delete a question
export const deleteQuestion = async (req, res) => {
  try {
    const deleted = await questionService.deleteQuestionService(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
