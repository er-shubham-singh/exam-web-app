// models/evaluationResult.model.js
import mongoose from "mongoose";

const codingResultSchema = new mongoose.Schema(
  {
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    // optional snapshot for audit/debug
    details: [
      {
        testIndex: Number,
        passed: Boolean,
        timeMs: Number,
        memoryMB: Number,
        stderr: String,
      },
    ],
  },
  { _id: false }
);

const perQuestionFeedbackSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionPapers",
    },
    questionText: { type: String },

    // Common to MCQ/Theory/Coding
    marksAwarded: Number,
    maxMarks: Number,
    remarks: String,

    // For coding questions only (optional)
    isCoding: { type: Boolean, default: false },
    codeLanguage: {
      type: String,
      enum: ["cpp", "java", "python", "javascript", "c", "go", "typescript"],
    },
    codeSubmitted: String, // last submitted code (or best attempt)
    codingResult: codingResultSchema,

    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const evaluationResultSchema = new mongoose.Schema(
  {
    studentExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentExam",
      required: true,
      unique: true,
    },

    // MCQ Evaluation
    mcqScore: { type: Number, default: 0 },
    totalMcqQuestions: { type: Number, default: 0 },

    // Theory Evaluation
    theoryScore: { type: Number, default: 0 },
    totalTheoryQuestions: { type: Number, default: 0 },
    theoryEvaluated: { type: Boolean, default: false },

    // Coding Evaluation (auto based on testcases, or manual override)
    codingScore: { type: Number, default: 0 },
    totalCodingQuestions: { type: Number, default: 0 },

    // Per-question feedback (works for all types)
    questionFeedback: [perQuestionFeedbackSchema],

    totalScore: { type: Number, default: 0 },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("EvaluationResult", evaluationResultSchema);
