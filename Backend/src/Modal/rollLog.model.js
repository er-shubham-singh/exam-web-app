import mongoose from "mongoose";

const { Schema } = mongoose;

const rollLogSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ link to User
    email: { type: String, required: true, lowercase: true, trim: true },
    rollNumber: { type: String, required: true, unique: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["SENT", "FAILED"], default: "SENT" },
  },
  { timestamps: true }
);

const RollLog = mongoose.model("RollLog", rollLogSchema);
export default RollLog;
