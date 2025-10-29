// middleware/authMiddleware.js - Authentication Middleware

const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect routes - require authentication
 * Verifies JWT token from Authorization header
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token found
    if (!token) {
      return ApiResponse.unauthorized(res, 'Not authorized, no token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database (exclude password)
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return ApiResponse.unauthorized(res, 'User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Account is deactivated');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return ApiResponse.unauthorized(res, 'Not authorized, token failed');
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work with or without auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  protect,
  optionalAuth
};