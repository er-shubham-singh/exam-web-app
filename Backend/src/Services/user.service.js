import mongoose from "mongoose";
import Domain from "../Modal/domain.model.js";
import User from "../Modal/user.modal.js";
import RollLog from "../Modal/rollLog.model.js";
import transporter from "../Config/email.config.js";
import { generateToken } from "../Config/auth.js";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateRollNumber = async () => {
  const part1 = Math.floor(Math.random() * 9) + 1;
  const part2 = new Date().getFullYear().toString().slice(-1);
  const part3 = Math.floor(Math.random() * 5) + 5;
  const part4to8 = Math.floor(10000 + Math.random() * 89999);
  const rollNumber = `${part1}${part2}${part3}${part4to8}`;

  const exists = await User.findOne({ rollNumber });
  if (exists) return generateRollNumber();

  return rollNumber;
};

// ---------------- REGISTER ----------------
export const registerUserService = async (data) => {
  const { name, email, category, domain } = data;

  if (!name || !email || !category || !domain) {
    throw new Error("All fields are required.");
  }
  if (!isValidEmail(email)) throw new Error("Invalid email format.");

  if (!mongoose.Types.ObjectId.isValid(domain)) {
    throw new Error("Invalid domain id.");
  }
  const domainDoc = await Domain.findById(domain);
  if (!domainDoc) throw new Error("Domain not found.");

  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists with this email.");

  const rollNumber = await generateRollNumber();

  const user = await User.create({
    name,
    email,
    category,
    domain,
    rollNumber,
  });

  let emailStatus = "SENT";

  try {
    await transporter.sendMail({
      from: `"Exam Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Exam Roll Number",
      html: `
        <h2>Hello ${name},</h2>
        <p>You have successfully registered for <b>${domainDoc.domain}</b> (${category}).</p>
        <p><b>Your Roll Number: ${rollNumber}</b></p>
        <p>Please keep this safe, it will be required for the exam.</p>
      `,
    });

    await RollLog.create({ user: user._id, email, rollNumber, status: "SENT" });
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    emailStatus = "FAILED";
    await RollLog.create({ user: user._id, email, rollNumber, status: "FAILED" });
  }

  return { user, emailStatus };
};

// ---------------- LOGIN ----------------
export const loginService = async (data) => {
  const { email, rollNo } = data;

  if (!email || !rollNo) {
    throw new Error("All fields are required.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format.");
  }

  // Find student
  const user = await User.findOne({ email, rollNumber: rollNo })
    .populate("domain", "domain category _id");

  if (!user) throw new Error("Invalid credentials");

  // Prepare payload for JWT
  const payload = {
    id: user._id,
    email: user.email,
    role: "student", // fixed role for this login
  };

  const token = generateToken(payload);

return {
  message: "Login successful",
  token,
  user: {   // ✅ correct key is user
    id: user._id,
    name: user.name,
    email: user.email,
    category: user.category,
    domain: user.domain.domain,
    domainId: user.domain._id,
    rollNumber: user.rollNumber,
    role: "student",
  },
};

};

