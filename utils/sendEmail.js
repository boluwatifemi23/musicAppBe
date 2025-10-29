// utils/sendEmail.js - Email Sending Utilities

const transporter = require('../config/nodemailer');

/**
 * Send email
 * @param {Object} options - Email options { to, subject, text, html }
 * @returns {Promise} Nodemailer result
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Music App <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error('Failed to send email');
  }
};

/**
 * Send OTP verification email
 * @param {String} email - Recipient email
 * @param {String} otp - OTP code
 * @param {String} name - User's name (optional)
 */
const sendOTPEmail = async (email, otp, name = 'User') => {
  const subject = 'Verify Your Email - Music App';
  const text = `Hi ${name},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 Music App</h1>
          <p>Email Verification</p>
        </div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>Welcome to Music App! To complete your registration, please verify your email address using the OTP below:</p>
          
          <div class="otp-box">
            <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
            <p class="otp-code">${otp}</p>
            <p style="margin: 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
          </div>
          
          <p><strong>Important:</strong> This code will expire in 10 minutes. If you didn't create an account, please ignore this email.</p>
          
          <div class="footer">
            <p>© 2024 Music App. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Send password reset email
 * @param {String} email - Recipient email
 * @param {String} resetToken - Password reset token
 * @param {String} name - User's name (optional)
 */
const sendPasswordResetEmail = async (email, resetToken, name = 'User') => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request - Music App';
  const text = `Hi ${name},\n\nYou requested to reset your password. Click the link below:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 Music App</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          
          <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </center>
          
          <p style="font-size: 12px; color: #666;">Or copy this link: ${resetUrl}</p>
          
          <p><strong>Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          
          <div class="footer">
            <p>© 2024 Music App. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Send welcome email
 * @param {String} email - Recipient email
 * @param {String} name - User's name
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Music App! 🎵';
  const text = `Hi ${name},\n\nWelcome to Music App! We're excited to have you on board.\n\nStart exploring millions of songs and create your personalized playlists.\n\nEnjoy the music!\n\nThe Music App Team`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 Welcome to Music App!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>We're thrilled to have you join our music community!</p>
          <p>You now have access to millions of songs, personalized playlists, and much more.</p>
          <p><strong>Start your musical journey:</strong></p>
          <ul>
            <li>🎧 Browse trending songs</li>
            <li>📝 Create your own playlists</li>
            <li>❤️ Like and save your favorite tracks</li>
            <li>👥 Follow your favorite artists</li>
          </ul>
          <p>Enjoy the music!</p>
          <p>The Music App Team</p>
          
          <div class="footer">
            <p>© 2024 Music App. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};