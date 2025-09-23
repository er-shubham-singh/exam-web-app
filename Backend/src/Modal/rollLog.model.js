// models/rollLog.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const rollLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    rollNumber: { type: String, required: true }, // don't make unique here
    domain: { type: Schema.Types.ObjectId, ref: "Domain", required: false }, // optional for registration
    sentAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["SENT", "FAILED", "STARTED", "COMPLETED", "CANCELLED"],
      default: "SENT",
    },

    // optional fields for attempt tracking
    startedAt: { type: Date },
    completedAt: { type: Date },

    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("RollLog", rollLogSchema);
