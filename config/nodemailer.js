// config/nodemailer.js

const nodemailer = require("nodemailer");

// Create and export a reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// Optional: verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email server connection failed:", error.message);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

module.exports = transporter;
