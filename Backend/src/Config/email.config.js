import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional: verify connection once on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP verify error:", err);
  } else {
    console.log("✅ Gmail SMTP ready to send emails");
  }
});

export default transporter;
