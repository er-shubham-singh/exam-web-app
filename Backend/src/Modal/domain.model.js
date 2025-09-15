import mongoose from "mongoose";

const domainSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["Technical", "Non-Technical"], required: true },
    domain: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent overwrite in dev environments
const Domain = mongoose.models.Domain || mongoose.model("Domain", domainSchema);

export default Domain;
