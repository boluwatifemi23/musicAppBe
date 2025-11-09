const { Follow, Artist, User, Playlist } = require('../models');
const ApiResponse = require('../utils/apiResponse');


const toggleFollowArtist = async (req, res, next) => {
  try {
    const artistId = req.params.id;

    
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    
    const result = await Follow.toggleFollow(req.user._id, 'artist', artistId);

    
    if (result.following) {
      artist.stats.totalFollowers += 1;
      req.user.stats.totalFollowing += 1;
    } else {
      artist.stats.totalFollowers = Math.max(0, artist.stats.totalFollowers - 1);
      req.user.stats.totalFollowing = Math.max(0, req.user.stats.totalFollowing - 1);
    }

    await artist.save({ validateBeforeSave: false });
    await req.user.save({ validateBeforeSave: false });

    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};


const toggleFollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

  
    if (targetUserId === req.user._id.toString()) {
      return ApiResponse.error(res, 'You cannot follow yourself', 400);
    }


    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return ApiResponse.notFound(res, 'User not found');
    }

    
    const result = await Follow.toggleFollow(req.user._id, 'user', targetUserId);

    
    if (result.following) {
      targetUser.stats.totalFollowers += 1;
      req.user.stats.totalFollowing += 1;
    } else {
      targetUser.stats.totalFollowers = Math.max(0, targetUser.stats.totalFollowers - 1);
      req.user.stats.totalFollowing = Math.max(0, req.user.stats.totalFollowing - 1);
    }

    await targetUser.save({ validateBeforeSave: false });
    await req.user.save({ validateBeforeSave: false });

    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getFollowedArtists = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const follows = await Follow.getFollowedArtists(req.user._id, page, limit);
    const total = await Follow.countFollowing(req.user._id, 'artist');

    const artists = follows.map(follow => ({
      ...follow.followingId.toObject(),
      followedAt: follow.createdAt
    }));

    return ApiResponse.paginated(res, artists, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getFollowedUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const follows = await Follow.getFollowedUsers(req.user._id, page, limit);
    const total = await Follow.countFollowing(req.user._id, 'user');

    const users = follows.map(follow => ({
      ...follow.followingId.toObject(),
      followedAt: follow.createdAt
    }));

    return ApiResponse.paginated(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const follows = await Follow.getFollowers('user', req.user._id, page, limit);
    const total = await Follow.countFollowers('user', req.user._id);

    const followers = follows.map(follow => ({
      ...follow.followerId.toObject(),
      followedAt: follow.createdAt
    }));

    return ApiResponse.paginated(res, followers, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getArtistFollowers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const follows = await Follow.getFollowers('artist', req.params.id, page, limit);
    const total = await Follow.countFollowers('artist', req.params.id);

    const followers = follows.map(follow => ({
      ...follow.followerId.toObject(),
      followedAt: follow.createdAt
    }));

    return ApiResponse.paginated(res, followers, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const checkFollowing = async (req, res, next) => {
  try {
    const { items } = req.body; 

    const results = {};

    for (const item of items) {
      const isFollowing = await Follow.isFollowing(req.user._id, item.type, item.id);
      results[item.id] = isFollowing;
    }

    return ApiResponse.success(res, results, 'Follow status checked');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleFollowArtist,
  toggleFollowUser,
  getFollowedArtists,
  getFollowedUsers,
  getFollowers,
  getArtistFollowers,
  checkFollowing
};