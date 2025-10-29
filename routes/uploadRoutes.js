// routes/uploadRoutes.js - File Upload Routes

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { isArtist } = require('../middleware/roleMiddleware');
const { uploadSingleImage, uploadSingleAudio } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Protected routes
router.post('/image', protect, uploadLimiter, uploadSingleImage, uploadController.uploadSingleImage);
router.post('/audio', protect, isArtist, uploadLimiter, uploadSingleAudio, uploadController.uploadAudioFile);
router.delete('/:publicId', protect, uploadController.deleteUploadedFile);

module.exports = router;