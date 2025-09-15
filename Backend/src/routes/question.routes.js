import express from 'express';
import {
  createQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
} from '../Controller/question.controller.js'; // ✅ Add `.js` extension

const router = express.Router();

// Routes
router.post('/create-question', createQuestion); // Create
router.get('/getAllQuestion', getAllQuestions);  // Read all
router.get('/questions/:id', getQuestionById);             // Read by ID
router.put('/questions/:id', updateQuestion);              // Update
router.delete('/questions/:id', deleteQuestion);           // Delete

export default router;
