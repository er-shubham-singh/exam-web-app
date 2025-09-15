// models/paper.model.js
import mongoose from "mongoose";

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    category: {
      type: String,
      enum: ["Technical", "Non-Technical"],
      required: true,
    },

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    description: { type: String, required: true },

    // Can include MCQ, THEORY, or CODING questions
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionPapers",
        required: true,
      },
    ],

    totalMarks: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Paper = mongoose.models.Paper || mongoose.model("Paper", paperSchema);
export default Paper;
