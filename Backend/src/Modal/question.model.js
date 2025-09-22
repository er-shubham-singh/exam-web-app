import mongoose from "mongoose";

const { Schema } = mongoose;
const testCaseSchema = new Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isPublic: { type: Boolean, default: false }, // show to student or keep hidden
    score: { type: Number, default: 1 },         // points for this test
  },
  { _id: false }
);
const starterCodeSchema = new Schema(
  {
    language: {
      type: String,
      enum: ["cpp", "java", "python", "javascript", "c", "go", "typescript"],
      required: true,
    },
    code: { type: String, default: "" },
  },
  { _id: false }
);
const questionSchema = new Schema(
  {
    category: {
      type: String,
      enum: ["Technical", "Non-Technical"],
      required: true,
    },
    domain: {
      type: Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["MCQ", "THEORY", "CODING"],
      default: "MCQ",
      index: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    // ---------- MCQ fields ----------
    options: [String], // only used if type === "MCQ"
    correctAnswer: {
      type: String, // e.g. "A", "B", "C", "D" or the exact option text
    },
    theoryAnswer: {
      type: String,
    },
    coding: {
      problemPrompt: { type: String }, 
      inputFormat: { type: String },
      outputFormat: { type: String },
      constraintsText: { type: String }, 
      timeLimitMs: { type: Number, default: 2000 },  
      memoryLimitMB: { type: Number, default: 256 }, 
      allowedLanguages: [
        {
          type: String,
          enum: ["cpp", "java", "python", "javascript", "c", "go", "typescript"],
        },
      ],
      defaultLanguage: {
        type: String,
        enum: ["cpp", "java", "python", "javascript", "c", "go", "typescript"],
      },
      starterCodes: [starterCodeSchema], 
      testCases: [testCaseSchema],
      maxRunAttempts: { type: Number, default: 3 },
      compareMode: {
        type: String,
        enum: ["exact", "trimmed", "ignoreCase", "custom"],
        default: "trimmed",
      },
    },
    marks: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);
const QuestionPaper =
  mongoose.models.QuestionPapers ||
  mongoose.model("QuestionPapers", questionSchema);
export default QuestionPaper;

