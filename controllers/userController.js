// controllers/userController.js - User Management Controller

const { User, PlayHistory, Follow } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadProfilePicture, deleteFile } = require('../utils/cloudinaryUpload');

// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Public
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Check if current user is viewing their own profile
    const isOwnProfile = req.user && req.user._id.toString() === user._id.toString();

    const profileData = {
      id: user._id,
      name: user.name,
      profilePicture: user.profilePicture.url,
      bio: user.bio,
      role: user.role,
      stats: user.stats,
      createdAt: user.createdAt
    };

    // Include email only for own profile
    if (isOwnProfile) {
      profileData.email = user.email;
      profileData.preferences = user.preferences;
    }

    return ApiResponse.success(res, profileData, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    return ApiResponse.success(
      res,
      {
        id: user._id,
        name: user.name,
        bio: user.bio,
        profilePicture: user.profilePicture.url
      },
      'Profile updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile picture
// @route   PUT /api/users/profile-picture
// @access  Private
const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an image', 400);
    }

    const user = await User.findById(req.user._id);

    // Delete old profile picture from Cloudinary
    if (user.profilePicture.publicId) {
      await deleteFile(user.profilePicture.publicId, 'image');
    }

    // Upload new profile picture
    const result = await uploadProfilePicture(req.file.path);

    user.profilePicture = {
      url: result.url,
      publicId: result.publicId
    };

    await user.save();

    return ApiResponse.success(
      res,
      { profilePicture: user.profilePicture.url },
      'Profile picture updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const { language, theme, emailNotifications, playbackQuality } = req.body;

    const user = await User.findById(req.user._id);

    if (language) user.preferences.language = language;
    if (theme) user.preferences.theme = theme;
    if (emailNotifications !== undefined) user.preferences.emailNotifications = emailNotifications;
    if (playbackQuality) user.preferences.playbackQuality = playbackQuality;

    await user.save();

    return ApiResponse.success(
      res,
      { preferences: user.preferences },
      'Preferences updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get listening stats
    const listeningStats = await PlayHistory.getUserStats(userId, 30);

    // Get top artists
    const topArtists = await PlayHistory.getTopArtists(userId, 5, 30);

    // Get following count
    const followingCount = await Follow.countFollowing(userId);
    const followersCount = await Follow.countFollowers('user', userId);

    return ApiResponse.success(
      res,
      {
        listening: listeningStats,
        topArtists: topArtists.map(item => ({
          artist: item.artist,
          playCount: item.playCount
        })),
        social: {
          following: followingCount,
          followers: followersCount
        },
        accountStats: req.user.stats
      },
      'Statistics retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's listening history
// @route   GET /api/users/history
// @access  Private
const getListeningHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const history = await PlayHistory.getUserHistory(req.user._id, page, limit);

    return ApiResponse.success(
      res,
      history,
      'Listening history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's recently played (unique)
// @route   GET /api/users/recently-played
// @access  Private
const getRecentlyPlayed = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const recent = await PlayHistory.getRecentlyPlayed(req.user._id, limit);

    return ApiResponse.success(
      res,
      recent.map(item => ({
        song: item._id,
        lastPlayed: item.lastPlayed,
        playCount: item.playCount
      })),
      'Recently played retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Verify password before deletion
    const user = await User.findById(req.user._id).select('+password');

    if (!user.googleId) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return ApiResponse.error(res, 'Invalid password', 401);
      }
    }

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    // Revoke all tokens
    const RefreshToken = require('../models/RefreshToken');
    await RefreshToken.revokeAllUserTokens(user._id);

    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Account deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  updatePreferences,
  getUserStats,
  getListeningHistory,
  getRecentlyPlayed,
  deleteAccount
};