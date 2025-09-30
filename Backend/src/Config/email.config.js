// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// // Optional: verify connection once on startup
// transporter.verify((err, success) => {
//   if (err) {
//     console.error("❌ SMTP verify error:", err);
//   } else {
//     console.log("✅ Gmail SMTP ready to send emails");
//   }
// });

// export default transporter;

// transporter.brevo.js

// config/email.js
// transporter.js
import 'dotenv/config';
import nodemailer from 'nodemailer';
import brevoTransport from 'nodemailer-brevo-transport';

// helper to ensure required env vars exist
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

const BREVO_API_KEY = requireEnv('BREVO_API_KEY');

console.log('📧 Brevo Auth: (API key set)');

// ✅ Create transporter (Brevo API)
const transporter = nodemailer.createTransport(
  brevoTransport({
    apiKey: BREVO_API_KEY,
  })
);

// ✅ Log initialization (API verify not needed)
console.log('✅ Brevo API transporter initialized (HTTP, not SMTP)');

export default transporter;
