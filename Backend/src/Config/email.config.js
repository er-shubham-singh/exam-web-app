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

import 'dotenv/config';                 // <-- loads .env at import time
import nodemailer from 'nodemailer';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v.trim();                      // trim accidental spaces/newlines
}

const BREVO_SMTP_USER = requireEnv('BREVO_SMTP_USER');
const BREVO_SMTP_KEY  = requireEnv('BREVO_SMTP_KEY');
// quick sanity log (masked)
console.log(
  'Brevo auth:',
  BREVO_SMTP_USER,
  BREVO_SMTP_KEY ? '(key set)' : '(missing)'
);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_KEY },
  // logger/debug only in dev
});

export default transporter;

