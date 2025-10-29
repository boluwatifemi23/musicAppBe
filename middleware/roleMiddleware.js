// middleware/roleMiddleware.js - Role-Based Access Control

const ApiResponse = require('../utils/apiResponse');

/**
 * Check if user has required role(s)
 * @param  {...String} roles - Allowed roles (e.g., 'artist', 'admin')
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be used after protect middleware)
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authorized');
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Check if user is an artist
 */
const isArtist = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authorized');
  }

  if (req.user.role !== 'artist' && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied. Artist account required');
  }

  next();
};

/**
 * Check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authorized');
  }

  if (req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied. Admin privileges required');
  }

  next();
};

/**
 * Check if user owns the resource or is an admin
 * @param {String} paramName - Name of the route parameter containing user ID
 */
const isOwnerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authorized');
    }

    const resourceUserId = req.params[paramName];
    
    // Allow if user owns the resource or is admin
    if (req.user._id.toString() === resourceUserId || req.user.role === 'admin') {
      next();
    } else {
      return ApiResponse.forbidden(res, 'Access denied. You can only access your own resources');
    }
  };
};

module.exports = {
  authorize,
  isArtist,
  isAdmin,
  isOwnerOrAdmin
};