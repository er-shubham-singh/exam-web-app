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
  let { name, email, category, domain, examAt } = data;

  // normalize
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  category = String(category || "").trim();
  domain = String(domain || "").trim();

  // validation
  if (!name || !email || !category || !domain) throw new Error("All fields are required.");
  if (!isValidEmail(email)) throw new Error("Invalid email format.");
  if (!examAt) throw new Error("examAt is required.");

  const when = new Date(examAt);
  if (isNaN(when.getTime())) throw new Error("Invalid examAt datetime.");

  // uniqueness (email+domain)
  const existing = await User.findOne({ email, domain });
  if (existing) throw new Error("User already exists with this email for this domain.");

  // create user
  const rollNumber = await generateRollNumber();
  const user = await User.create({ name, email, category, domain, rollNumber, examAt });

  // --- Pretty schedule strings (now that `when` exists) ---
  // 24-hour (h23) + weekday
  const prettyIST24 = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(when);

  // 12-hour (h12)
  const prettyIST12 = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).format(when);

  const scheduleLine = `${prettyIST24} (i.e., ${prettyIST12} IST)`;

  let emailStatus = "SENT";
  let messageId = null;

  try {
    const fromEmail = process.env.SMTP_USER?.trim();
    const fromName  = process.env.SMTP_FROM_NAME?.trim() || "Exam Portal";
    const replyTo   = process.env.REPLY_TO_EMAIL?.trim() || fromEmail;

    if (!fromEmail || !fromEmail.includes("@")) {
      throw new Error("SMTP_FROM_EMAIL must be a valid email and verified in Brevo");
    }

    // (Optional) simple ICS attachment builder
    const toIcsDate = (dtUtc) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${dtUtc.getUTCFullYear()}${pad(dtUtc.getUTCMonth()+1)}${pad(dtUtc.getUTCDate())}` +
             `T${pad(dtUtc.getUTCHours())}${pad(dtUtc.getUTCMinutes())}${pad(dtUtc.getUTCSeconds())}Z`;
    };
    const dtStartUtc = new Date(when.getTime());          // `when` already represents the correct instant
    const dtEndUtc   = new Date(dtStartUtc.getTime() + 90 * 60 * 1000); // 90m
    const ics =
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Exam Portal//Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${user._id}@yourdomain.com`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(dtStartUtc)}`,
        `DTEND:${toIcsDate(dtEndUtc)}`,
        `SUMMARY:Exam (${category})`,
        `DESCRIPTION:Roll: ${rollNumber}\\nTime: ${scheduleLine}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      replyTo,
      subject: "Your Exam Roll Number & Schedule",
      text: `Hello ${name},

You have successfully registered for the exam under category ${category}.
Your Roll Number: ${rollNumber}

Exam Schedule:
${scheduleLine}

Please keep this safe; it will be required to login and take the exam.`,
      html: `
        <h2>Hello ${escapeHtml(name)},</h2>
        <p>You have successfully registered for the exam under category <b>${escapeHtml(category)}</b>.</p>
        <p><b>Your Roll Number: ${escapeHtml(rollNumber)}</b></p>
        <p><b>Exam Schedule:</b><br/>
           ${escapeHtml(prettyIST24)} <em>(i.e., ${escapeHtml(prettyIST12)} IST)</em>
        </p>
        <p>Please keep this safe; it will be required to login and take the exam.</p>
        <hr/>
        <p style="font-size:12px">
          If you didn’t request this, ignore this message.
          <br/>Unsubscribe: <a href="https://yourdomain.com/unsubscribe?email=${encodeURIComponent(email)}">click here</a>
        </p>
      `,
      envelope: { from: fromEmail, to: email },
      attachments: [
        {
          filename: "exam.ics",
          content: ics,
          contentType: "text/calendar; method=PUBLISH",
        },
      ],
    });

    messageId = info?.messageId || null;

    await RollLog.create({
      user: user._id,
      email,
      rollNumber,
      status: "SENT",
      messageId,
      examAt,
      // domain, // add if your RollLog schema supports it at registration time
    });
  } catch (err) {
    emailStatus = "FAILED";
    await RollLog.create({
      user: user._id,
      email,
      rollNumber,
      status: "FAILED",
      messageId,
      examAt,
      error: err?.message?.slice(0, 500),
    });
  }

  return { user, emailStatus, messageId, examAt };
};


// Optional tiny helper to avoid HTML injection in the email
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


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

