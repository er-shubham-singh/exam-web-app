// models/paperSet.model.js
import mongoose from "mongoose";

const paperSetSchema = new mongoose.Schema(
  {
    paperTemplate: { type: mongoose.Schema.Types.ObjectId, ref: "PaperTemplate", required: true },
    setLabel: { type: String, required: true }, // "A", "B", "Set-01"
    description: String,
    questions: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionPapers", required: true },
        marks: { type: Number, default: 1 },
        shuffleOptions: { type: Boolean, default: false },
      },
    ],
    timeLimitMin: { type: Number },
    totalMarks: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    publishedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    randomSeed: { type: String }, // optional reproducible seed
  },
  { timestamps: true }
);

paperSetSchema.index({ paperTemplate: 1, setLabel: 1 }, { unique: true });

const PaperSet = mongoose.models.PaperSet || mongoose.model("PaperSet", paperSetSchema);
export default PaperSet;
