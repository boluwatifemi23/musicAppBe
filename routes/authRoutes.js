const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authValidation } = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');


router.post('/signup', authLimiter, authValidation.signup, authController.signup);
router.post('/verify-email', authLimiter, authValidation.verifyEmail, authController.verifyEmail);
router.post('/resend-otp', authLimiter, authValidation.forgotPassword, authController.resendOTP);
router.post('/login', authLimiter, authValidation.login, authController.login);

router.post('/refresh-token', authController.refreshAccessToken);
router.post('/forgot-password', passwordResetLimiter, authValidation.forgotPassword, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authValidation.resetPassword, authController.resetPassword);

router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/me', protect, authController.getMe);

module.exports = router;