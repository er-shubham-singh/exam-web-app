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
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    category: {
      type: String,
      enum: ["Technical", "Non-Technical"],
      required: [true, "Category is required"],
    },

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain", // linking with your Domain model
      required: [true, "Domain is required"],
    },
rollNumber: {
  type: String,
  unique: true,
  default: null,   // ✅ no validation error at save time
},


    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
