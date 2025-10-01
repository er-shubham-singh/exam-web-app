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

// src/Config/email.config.js
// transporter.js

// transporter.js

import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ Brevo SMTP verify error:", err);
  } else {
    console.log("✅ Brevo SMTP ready to send emails");
  }
});

export default transporter;
