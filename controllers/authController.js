const { User, RefreshToken } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/generateToken');
const { generateOTP, generateOTPExpiry, validateOTP } = require('../utils/generateOtp');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/sendEmail');
const ApiResponse = require('../utils/apiResponse');

const crypto = require('crypto');


const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return ApiResponse.error(res, 'Email already registered', 400);
    }

    
    const otp = generateOTP(6);
    const otpExpiry = generateOTPExpiry(10); 

    
    const user = await User.create({
      name,
      email,
      password,
      verificationOtp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    
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


const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    
    if (user.isVerified) {
      return ApiResponse.error(res, 'Email already verified', 400);
    }

    
    const validation = validateOTP(
      otp,
      user.verificationOtp.code,
      user.verificationOtp.expiresAt
    );

    if (!validation.valid) {
      return ApiResponse.error(res, validation.message, 400);
    }

    
    user.isVerified = true;
    user.clearVerificationOTP();
    await user.save();

    
    await sendWelcomeEmail(user.email, user.name);
    const { accessToken, refreshToken } = generateTokens(user._id);

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || 'Unknown'
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    });

    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 
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

    
    const otp = generateOTP(6);
    const otpExpiry = generateOTPExpiry(10);

    user.verificationOtp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    
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


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'Account is deactivated', 403);
    }

    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    
    if (!user.isVerified) {
      return ApiResponse.error(
        res,
        'Please verify your email first',
        403,
        { userId: user._id, email: user.email }
      );
    }

    
    const { accessToken, refreshToken } = generateTokens(user._id);

    
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || 'Unknown'
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    
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


const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken: tokenFromBody } = req.body;
    const tokenFromCookie = req.cookies.refreshToken;

    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token not provided', 401);
    }

    const tokenDoc = await RefreshToken.findValidToken(refreshToken);
    if (!tokenDoc) {
      return ApiResponse.error(res, 'Invalid or expired refresh token', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      await tokenDoc.revoke();
      return ApiResponse.error(res, 'Invalid refresh token', 401);
    }

    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      await tokenDoc.revoke();
      return ApiResponse.error(res, 'User not found or inactive', 401);
    }

    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    await tokenDoc.revoke();
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      deviceInfo: tokenDoc.deviceInfo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    
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

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true }
      );
    }

    
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};


const logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.revokeAllUserTokens(req.user._id);
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logged out from all devices');
  } catch (error) {
    next(error);
  }
};


const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
     
      return ApiResponse.success(
        res,
        null,
        'If email exists, password reset link has been sent'
      );
    }

    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; 
    await user.save();

   
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


const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

   
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return ApiResponse.error(res, 'Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await RefreshToken.revokeAllUserTokens(user._id);

    return ApiResponse.success(res, null, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};


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
  refreshAccessToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getMe
};