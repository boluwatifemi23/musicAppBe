// controllers/authController.js - Authentication Controller

const { User, RefreshToken } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/generateToken');
const { generateOTP, generateOTPExpiry, validateOTP } = require('../utils/generateOtp');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/sendEmail');
const ApiResponse = require('../utils/apiResponse');
// const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return ApiResponse.error(res, 'Email already registered', 400);
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpExpiry = generateOTPExpiry(10); // 10 minutes

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      verificationOtp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    // Send verification email
    await sendOTPEmail(email, otp, name);

    return ApiResponse.success(
      res,
      {
        userId: user._id,
        email: user.email,
        message: 'OTP sent to your email'
      },
      'Registration successful. Please verify your email.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    // Check if already verified
    if (user.isVerified) {
      return ApiResponse.error(res, 'Email already verified', 400);
    }

    // Validate OTP
    const validation = validateOTP(
      otp,
      user.verificationOtp.code,
      user.verificationOtp.expiresAt
    );

    if (!validation.valid) {
      return ApiResponse.error(res, validation.message, 400);
    }

    // Mark as verified
    user.isVerified = true;
    user.clearVerificationOTP();
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || 'Unknown'
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture.url,
          isVerified: user.isVerified
        },
        accessToken
      },
      'Email verified successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    if (user.isVerified) {
      return ApiResponse.error(res, 'Email already verified', 400);
    }

    // Generate new OTP
    const otp = generateOTP(6);
    const otpExpiry = generateOTPExpiry(10);

    user.verificationOtp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp, user.name);

    return ApiResponse.success(
      res,
      null,
      'OTP resent successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return ApiResponse.error(res, 'Account is deactivated', 403);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    // Check if email is verified
    if (!user.isVerified) {
      return ApiResponse.error(
        res,
        'Please verify your email first',
        403,
        { userId: user._id, email: user.email }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || 'Unknown'
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Update last login
    await user.updateLastLogin();

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture.url,
          isVerified: user.isVerified
        },
        accessToken
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
};



// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken: tokenFromBody } = req.body;
    const tokenFromCookie = req.cookies.refreshToken;

    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token not provided', 401);
    }

    // Verify token in database
    const tokenDoc = await RefreshToken.findValidToken(refreshToken);
    if (!tokenDoc) {
      return ApiResponse.error(res, 'Invalid or expired refresh token', 401);
    }

    // Verify JWT
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      await tokenDoc.revoke();
      return ApiResponse.error(res, 'Invalid refresh token', 401);
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      await tokenDoc.revoke();
      return ApiResponse.error(res, 'User not found or inactive', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Revoke old token and create new one
    await tokenDoc.revoke();
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      deviceInfo: tokenDoc.deviceInfo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Update cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ApiResponse.success(
      res,
      { accessToken },
      'Token refreshed successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true }
      );
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.revokeAllUserTokens(req.user._id);
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logged out from all devices');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return ApiResponse.success(
        res,
        null,
        'If email exists, password reset link has been sent'
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken, user.name);

    return ApiResponse.success(
      res,
      null,
      'If email exists, password reset link has been sent'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return ApiResponse.error(res, 'Invalid or expired reset token', 400);
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all tokens for security
    await RefreshToken.revokeAllUserTokens(user._id);

    return ApiResponse.success(res, null, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    return ApiResponse.success(
      res,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture.url,
        bio: user.bio,
        isVerified: user.isVerified,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
      },
      'User retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  verifyEmail,
  resendOTP,
  login,
  // googleAuth,
  refreshAccessToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getMe
};