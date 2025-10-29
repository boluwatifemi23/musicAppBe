// middleware/index.js - Export all middleware

const { protect, optionalAuth } = require('./authMiddleware');
const { authorize, isArtist, isAdmin, isOwnerOrAdmin } = require('./roleMiddleware');
const errorHandler = require('./errorHandler');
const { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter, 
  searchLimiter, 
  passwordResetLimiter 
} = require('./rateLimiter');
const { 
  validate,
  authValidation,
  userValidation,
  songValidation,
  albumValidation,
  playlistValidation,
  artistValidation,
  idValidation,
  paginationValidation
} = require('./validation');
const {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleAudio,
  uploadProfilePicture,
  uploadCoverImage,
  uploadSong,
  uploadAlbum,
  handleMulterError
} = require('./uploadMiddleware');
const corsMiddleware = require('./cors');

module.exports = {
  // Auth
  protect,
  optionalAuth,
  
  // Roles
  authorize,
  isArtist,
  isAdmin,
  isOwnerOrAdmin,
  
  // Error handling
  errorHandler,
  
  // Rate limiting
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  passwordResetLimiter,
  
  // Validation
  validate,
  authValidation,
  userValidation,
  songValidation,
  albumValidation,
  playlistValidation,
  artistValidation,
  idValidation,
  paginationValidation,
  
  // File uploads
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleAudio,
  uploadProfilePicture,
  uploadCoverImage,
  uploadSong,
  uploadAlbum,
  handleMulterError,
  
  // CORS
  corsMiddleware
};