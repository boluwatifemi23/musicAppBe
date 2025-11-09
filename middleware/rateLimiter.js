

const rateLimit = require('express-rate-limit');


const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
 
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true 
});


const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10,
  message: {
    success: false,
    message: 'Too many upload attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});


const searchLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 30,
  message: {
    success: false,
    message: 'Too many search requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});


const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  passwordResetLimiter
};