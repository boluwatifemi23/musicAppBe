// routes/userRoutes.js - User Management Routes

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfilePicture } = require('../middleware/uploadMiddleware');
const { userValidation, paginationValidation } = require('../middleware/validation');

// Public routes
router.get('/profile/:id', userController.getUserProfile);

// Protected routes
router.put('/profile', protect, userValidation.updateProfile, userController.updateProfile);
router.put('/profile-picture', protect, uploadProfilePicture, userController.updateProfilePicture);
router.put('/preferences', protect, userController.updatePreferences);
router.get('/stats', protect, userController.getUserStats);
router.get('/history', protect, paginationValidation, userController.getListeningHistory);
router.get('/recently-played', protect, userController.getRecentlyPlayed);
router.delete('/account', protect, userController.deleteAccount);

module.exports = router;