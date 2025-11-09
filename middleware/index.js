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
  protect,
  optionalAuth,
  authorize,
  isArtist,
  isAdmin,
  isOwnerOrAdmin,
  errorHandler,
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  passwordResetLimiter,
  
  validate,
  authValidation,
  userValidation,
  songValidation,
  albumValidation,
  playlistValidation,
  artistValidation,
  idValidation,
  paginationValidation,
  
  
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleAudio,
  uploadProfilePicture,
  uploadCoverImage,
  uploadSong,
  uploadAlbum,
  handleMulterError,
  
  
  corsMiddleware
};