// models/stuedntExam.modal.js
import mongoose from "mongoose";

const AnswerSubSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionPapers", required: true },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    isCorrect: { type: Boolean, default: null },

    lastSavedAt: { type: Date },

    attempts: [
      {
        attemptNumber: Number,
        summary: { passedCount: Number, totalCount: Number, score: Number },
        submittedAt: Date,
      },
    ],
  },
  { _id: false } 
);

const studentExamSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Paper", required: true },
    answers: {
      type: [AnswerSubSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED", "EVALUATED"],
      default: "IN_PROGRESS",
    },
    score: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("StudentExam", studentExamSchema);
