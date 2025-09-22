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
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionPapers",
        required: true,
      },
    ],
defaultTimeLimitMin: { type: Number, default: 60 },
    totalMarks: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PaperTemplate = mongoose.models.PaperTemplate || mongoose.model("PaperTemplate", paperSchema);
export default PaperTemplate;
