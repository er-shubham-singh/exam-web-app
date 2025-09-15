// scripts/create-admin.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import Admin from "../src/Modal/admin.permission.model.js"; // adjust path

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const email = process.env.INIT_ADMIN_EMAIL || "admin@local.test";
const pass  = process.env.INIT_ADMIN_PASS  || "Admin@1234";
const hash  = await bcrypt.hash(pass, 10);

const exists = await Admin.findOne({ email: email.toLowerCase() });
if (!exists) {
  await Admin.create({ email: email.toLowerCase(), password: hash, role: "admin", name: "Super Admin", isTempPassword: false });
  console.log("Admin created:", email, "password:", pass);
} else {
  console.log("Admin already exists:", email);
}
await mongoose.disconnect();
process.exit(0);
