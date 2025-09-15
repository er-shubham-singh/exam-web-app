import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },   // e.g. "B.Tech", etc.
    domain:   { type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true },
    duration: { type: Number, default: 30 },      // minutes
    questions:[{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
