// utils/generateToken.js - JWT Token Generation

const jwt = require('jsonwebtoken');

/**
 * Generate Access Token (short-lived, 15 minutes)
 * @param {String} userId - User's MongoDB ID
 * @returns {String} JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId }, // Payload
    process.env.JWT_SECRET, // Secret key
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } // Expires in 15 minutes
  );
};

/**
 * Generate Refresh Token (long-lived, 7 days)
 * @param {String} userId - User's MongoDB ID
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET, // Different secret for refresh tokens
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } // Expires in 7 days
  );
};

/**
 * Generate both access and refresh tokens
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokens = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};

/**
 * Verify Access Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify Refresh Token
 * @param {String} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
};