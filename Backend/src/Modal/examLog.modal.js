
import mongoose from "mongoose";

const examLogSchema = new mongoose.Schema(
  {
    studentExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentExam",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "JOIN_EXAM",
        "TAB_SWITCH",
        "CAMERA_OFF",
        "CAMERA_BLOCKED",     // ✅ camera covered/blocked
        "ANSWER_UPDATE",
        "SUBMIT_EXAM",
        "FORCE_SUBMIT",
        "DISCONNECT",
        "EYE_OFF_SCREEN",     // ✅ gaze away / no face
        "MULTIPLE_FACES",     // ✅ more than one person
        "HAND_OBSTRUCTION",   // ✅ hand covering face
        "CODE_RUN",           // ✅ NEW: log when student runs code
        "CODE_RUN_SUCCESS",   // ✅ optional: mark success runs
        "CODE_RUN_FAIL"       // ✅ optional: mark failed runs
      ],
      required: true,
      index: true,
    },
    details: {
      type: Object,          // { email, issue, questionId, code, result… }
      default: {},
    },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Helpful compound indexes for mentor hydration & filtering
examLogSchema.index({ studentExam: 1, createdAt: -1 });
examLogSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.model("ExamLog", examLogSchema);
