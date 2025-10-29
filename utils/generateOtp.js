// utils/generateOtp.js - OTP Generation & Validation

const otpGenerator = require('otp-generator');

/**
 * Generate a numeric OTP
 * @param {Number} length - OTP length (default: 6)
 * @returns {String} Generated OTP
 */
const generateOTP = (length = 6) => {
  return otpGenerator.generate(length, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });
};

/**
 * Generate OTP expiry time
 * @param {Number} minutes - Minutes until expiry (default: 10)
 * @returns {Date} Expiry timestamp
 */
const generateOTPExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if OTP has expired
 * @param {Date} expiryTime - OTP expiry timestamp
 * @returns {Boolean} true if expired
 */
const isOTPExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

/**
 * Validate OTP
 * @param {String} inputOtp - OTP entered by user
 * @param {String} storedOtp - OTP stored in database
 * @param {Date} expiryTime - OTP expiry time
 * @returns {Object} { valid: Boolean, message: String }
 */
const validateOTP = (inputOtp, storedOtp, expiryTime) => {
  // Check if OTP is expired
  if (isOTPExpired(expiryTime)) {
    return {
      valid: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }

  // Check if OTP matches
  if (inputOtp !== storedOtp) {
    return {
      valid: false,
      message: 'Invalid OTP. Please try again.'
    };
  }

  return {
    valid: true,
    message: 'OTP verified successfully'
  };
};

module.exports = {
  generateOTP,
  generateOTPExpiry,
  isOTPExpired,
  validateOTP
};