// models/codingAttempt.model.js
import mongoose from "mongoose";

const runResultSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["success", "failed", "timeout", "compile_error", "runtime_error"],
      required: true,
    },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    stdout: String,
    stderr: String,
    timeMs: Number,
    memoryMB: Number,
    tests: [
      {
        index: Number,
        passed: Boolean,
        timeMs: Number,
        memoryMB: Number,
        stdout: String,
        stderr: String,
      },
    ],
  },
  { _id: false }
);

const codingAttemptSchema = new mongoose.Schema(
  {
    studentExam: { type: mongoose.Schema.Types.ObjectId, ref: "StudentExam", required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionPapers", required: true, index: true },
    attemptNumber: { type: Number, required: true },
    language: { type: String, enum: ["cpp", "java", "python", "javascript", "c", "go", "typescript"], required: true },
    code: { type: String, required: true },

    // NEW:
    stdin: { type: String, default: "" },          // student-provided stdin for feedback runs
    runMode: { type: String, enum: ["feedback", "graded"], default: "feedback" },

    result: runResultSchema,
    runAt: { type: Date, default: Date.now },
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who triggered the run
  },
  { timestamps: true }
);

codingAttemptSchema.index({ studentExam: 1, question: 1, attemptNumber: 1 }, { unique: true });

const CodingAttempt = mongoose.models.CodingAttempt || mongoose.model("CodingAttempt", codingAttemptSchema);
export default CodingAttempt;
