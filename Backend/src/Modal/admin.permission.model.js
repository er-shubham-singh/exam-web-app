// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "mentor", "evaluator", "student"], required: true },
  name: { type: String },
  isTempPassword: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("AdminPermission", UserSchema);
