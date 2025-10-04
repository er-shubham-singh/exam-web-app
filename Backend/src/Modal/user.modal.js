import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },

    category: {
      type: String,
      enum: ["Technical", "Non-Technical"],
      required: [true, "Category is required"],
    },

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: [true, "Domain is required"],
      index: true,
    },

    rollNumber: {
      type: String,
      unique: true,
      default: null, // ✅ avoids validation error before generation
    },

    // 🆕 Exam schedule field
    examAt: {
      type: Date,
      required: [true, "Exam date & time is required"],
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Optional compound index for uniqueness (email + domain)
userSchema.index({ email: 1, domain: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
