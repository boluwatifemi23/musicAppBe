const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.unauthorized(res, 'Not authorized, no token provided');
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return ApiResponse.unauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return ApiResponse.unauthorized(res, 'Not authorized, token failed');
  }
};

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
    next();
  }
};

module.exports = {
  protect,
  optionalAuth
};