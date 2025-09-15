// services/employee.service.js
import crypto from "crypto";
import bcrypt from "bcrypt";
import adminPermissionModel from "../Modal/admin.permission.model.js";
import transporter from "../Config/email.config.js";
import jwt from "jsonwebtoken";


/** generate random temp password */
export function generateTempPassword(len = 10) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}

async function sendOnboardEmail({ toEmail, passwordPlain, role, name = "" }) {
  const subject = "Your account on Exam Portal";
  const html = `
    <p>Hi ${name || ""},</p>
    <p>An administrator created an account for you on <strong>Exam Portal</strong>.</p>
    <ul>
      <li><strong>Email:</strong> ${toEmail}</li>
      <li><strong>Password:</strong> <code>${passwordPlain}</code></li>
      <li><strong>Role:</strong> ${role}</li>
    </ul>
    <p>Please login and change your password right away.</p>
    <p>— Exam Portal Team</p>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Exam Portal" <no-reply@example.com>',
    to: toEmail,
    subject,
    html,
  });
  return info;
}

/**
 * Create employee. If `plainPassword` provided use it; otherwise generate a temp one.
 * createdBy is optional for audit (admin id)
 */
export async function createEmployee({ email, role, name = "", plainPassword = null, createdBy = null }) {
  if (!email || !role) {
    const err = new Error("Email and role are required");
    err.code = "INVALID_INPUT";
    throw err;
  }

  const normalized = String(email).toLowerCase();
  const existing = await adminPermissionModel.findOne({ email: normalized });
  if (existing) {
    const err = new Error("User already exists");
    err.code = "USER_EXISTS";
    throw err;
  }

  // Decide password: if admin provided plainPassword use it, else generate one
  const passwordToSend = plainPassword || generateTempPassword(10);

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(passwordToSend, salt);

  const userDoc = new adminPermissionModel({
    email: normalized,
    password: hashed,
    role,
    name,
    isTempPassword: plainPassword ? false : true, // if admin provided password we may still set false; but recommend forcing change
    createdBy,
  });

  await userDoc.save();

  // Try to send onboarding email (log error but don't rollback creation)
  try {
    await sendOnboardEmail({ toEmail: normalized, passwordPlain: passwordToSend, role, name });
  } catch (mailErr) {
    console.error("sendOnboardEmail error:", mailErr);
    // do not throw — admin can resend using resend endpoint
  }

  const userObj = userDoc.toObject();
  delete userObj.password;

  // For dev convenience, return plain password when not in production
  if (process.env.NODE_ENV !== "production") {
    return { user: userObj, tempPassword: passwordToSend };
  }
  return { user: userObj, tempPasswordSent: true };
}

/** resend (generate new or reuse?) - here we generate a new temp password and email it */
export async function resendTempPassword(email) {
  const normalized = String(email).toLowerCase();
  const user = await adminPermissionModel.findOne({ email: normalized });
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const tempPassword = generateTempPassword(10);
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(tempPassword, salt);

  user.password = hashed;
  user.isTempPassword = true;
  await user.save();

  await sendOnboardEmail({ toEmail: normalized, passwordPlain: tempPassword, role: user.role, name: user.name });
  return { ok: true };
}

/** list users (same as before) */
export async function listEmployees(filter = {}) {
  const q = {};
  if (filter.role) q.role = filter.role;
  const users = await adminPermissionModel.find(q).select("-password").sort({ createdAt: -1 }).lean();
  return users;
}



export async function adminLoginService({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await adminPermissionModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  // compare hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  // issue JWT
  const payload = { id: user._id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

  // remove sensitive info
  const userObj = user.toObject();
  delete userObj.password;

  return { token, user: userObj, isTempPassword: user.isTempPassword };
}