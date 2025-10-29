// utils/index.js - Export all utilities

const validateEnv = require('./validateEnv');
const ApiResponse = require('./apiResponse');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  generateTokens, 
  verifyAccessToken, 
  verifyRefreshToken 
} = require('./generateToken');
const { 
  generateOTP, 
  generateOTPExpiry, 
  isOTPExpired, 
  validateOTP 
} = require('./generateOtp');
const { 
  sendEmail, 
  sendOTPEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} = require('./sendEmail');
const { 
  uploadImage, 
  uploadAudio, 
  uploadProfilePicture, 
  deleteFile, 
  deleteMultipleFiles 
} = require('./cloudinaryUpload');
const { 
  streamAudio, 
  getAudioMetadata, 
  formatDuration 
} = require('./streamAudio');

module.exports = {
  // Environment
  validateEnv,
  
  // API Response
  ApiResponse,
  
  // Token Generation
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  
  // OTP
  generateOTP,
  generateOTPExpiry,
  isOTPExpired,
  validateOTP,
  
  // Email
  sendEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  
  // Cloudinary
  uploadImage,
  uploadAudio,
  uploadProfilePicture,
  deleteFile,
  deleteMultipleFiles,
  
  // Audio Streaming
  streamAudio,
  getAudioMetadata,
  formatDuration
};