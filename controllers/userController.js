const { User, PlayHistory, Follow } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadProfilePicture, deleteFile } = require('../utils/cloudinaryUpload');


const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

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

    if (isOwnProfile) {
      profileData.email = user.email;
      profileData.preferences = user.preferences;
    }

    return ApiResponse.success(res, profileData, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

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


const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an image', 400);
    }

    const user = await User.findById(req.user._id);

    if (user.profilePicture.publicId) {
      await deleteFile(user.profilePicture.publicId, 'image');
    }

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


const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const listeningStats = await PlayHistory.getUserStats(userId, 30);

    const topArtists = await PlayHistory.getTopArtists(userId, 5, 30);

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


const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user.googleId) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return ApiResponse.error(res, 'Invalid password', 401);
      }
    }

    user.isActive = false;
    await user.save();
    
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