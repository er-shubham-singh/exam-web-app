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
  const { name, email, category } = data;

  // ✅ Basic validation
  if (!name || !email || !category) throw new Error("All fields are required.");
  if (!isValidEmail(email)) throw new Error("Invalid email format.");

  // ✅ Check existing
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists with this email.");

  // ✅ Create user with generated roll number
  const rollNumber = await generateRollNumber();
  const user = await User.create({ name, email, category, rollNumber });

  let emailStatus = "SENT";
  let messageId = null;

  try {
    const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
    const fromName  = process.env.BREVO_FROM_NAME?.trim() || 'Exam Portal';
    const replyTo   = process.env.REPLY_TO_EMAIL?.trim() || fromEmail;

    console.log(`📨 Sending mail to ${email}...`);
    console.log(`From: ${fromName} <${fromEmail}>`);
    console.log(`Reply-To: ${replyTo}`);

    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('BREVO_FROM_EMAIL must be a valid email and verified in Brevo');
    }

    // ✅ Send email using Brevo API transporter
const info = await transporter.sendMail({
  from: `${fromName} <${fromEmail}>`,     // e.g., "Exam Portal <no-reply@yourdomain.com>"
  to: email,
  replyTo,
  subject: "Your Exam Roll Number",
  text: `Hello ${name},

You have successfully registered for the exam under category ${category}.
Your Roll Number: ${rollNumber}

Please keep this safe; it will be required to login and take the exam.`,
  html: `
    <h2>Hello ${name},</h2>
    <p>You have successfully registered for the exam under category <b>${category}</b>.</p>
    <p><b>Your Roll Number: ${rollNumber}</b></p>
    <p>Please keep this safe; it will be required to login and take the exam.</p>
    <hr/>
    <p style="font-size:12px">
      If you didn’t request this, ignore this message.
      <br/>Unsubscribe: <a href="https://yourdomain.com/unsubscribe?email=${encodeURIComponent(email)}">click here</a>
    </p>
  `,
  // Envelope MAIL FROM should be your domain (helps SPF/DMARC alignment)
  envelope: { from: fromEmail, to: email },

  headers: {
    "List-Unsubscribe": `<mailto:unsubscribe@yourdomain.com>, <https://yourdomain.com/unsubscribe?email=${encodeURIComponent(email)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Mailin-Tag": "exam-roll",
    "X-Mailin-Custom": JSON.stringify({ feature: "registration" }),
  },
});


    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info?.messageId || '(none)');
    console.log('📨 API Response:', info?.response || '(no response)');

    messageId = info?.messageId || null;

    // ✅ Log success in DB
    await RollLog.create({
      user: user._id,
      email,
      rollNumber,
      status: "SENT",
      messageId,
    });

  } catch (err) {
    console.error('❌ Email sending failed:', err?.message);
    emailStatus = "FAILED";

    // ✅ Log failure
    await RollLog.create({
      user: user._id,
      email,
      rollNumber,
      status: "FAILED",
      messageId,
      error: err?.message?.slice(0, 500),
    });
  }

  return { user, emailStatus };
};


// login part of your service file
export const loginService = async (data) => {
  const { email, rollNo, category, domain } = data;

  if (!email || !rollNo || !category || !domain) {
    throw new Error("All fields are required.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format.");
  }

  if (!mongoose.Types.ObjectId.isValid(domain)) {
    throw new Error("Invalid domain id.");
  }

  const domainDoc = await Domain.findById(domain);
  if (!domainDoc) throw new Error("Domain not found.");

  // Find student by email + rollNumber
  const user = await User.findOne({ email, rollNumber: rollNo });
  if (!user) throw new Error("Invalid credentials");

  // if user.category is an id/string adjust comparison accordingly
  if (String(user.category) !== String(category)) {
    throw new Error("Category mismatch with registered data.");
  }

  // Prevent multiple attempts for same user + domain
  const existingAttempt = await RollLog.findOne({
    user: user._id,
    domain: domain,
    status: { $in: ["STARTED", "COMPLETED"] },
  });

  if (existingAttempt) {
    throw new Error("You have already started or completed the exam for this domain.");
  }

  const payload = { id: user._id, email: user.email, role: "student" };
  const token = generateToken(payload);

  // create STARTED attempt with domain
  await RollLog.create({
    user: user._id,
    email: user.email,
    rollNumber: user.rollNumber,
    domain: domain,
    status: "STARTED",
    startedAt: new Date(),
  });

  return {
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      category: user.category,
      domain: domainDoc.domain,
      domainId: domainDoc._id,
      rollNumber: user.rollNumber,
      role: "student",
    },
  };
};

