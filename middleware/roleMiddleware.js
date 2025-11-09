

const ApiResponse = require('../utils/apiResponse');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
};


const isArtist = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authorized');
  }

  if (req.user.role !== 'artist' && req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied. Artist account required');
  }

  next();
};


const isAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authorized');
  }

  if (req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied. Admin privileges required');
  }

  next();
};


const isOwnerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authorized');
    }

    const resourceUserId = req.params[paramName];
    
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