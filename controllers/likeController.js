const { Like, Song, Album, Playlist } = require('../models');
const ApiResponse = require('../utils/apiResponse');


const toggleLikeSong = async (req, res, next) => {
  try {
    const songId = req.params.id;

    
    const song = await Song.findById(songId);
    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

   
    const result = await Like.toggleLike(req.user._id, 'song', songId);

  
    if (result.liked) {
      await song.incrementLikeCount();
    } else {
      await song.decrementLikeCount();
    }

    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};


const toggleLikeAlbum = async (req, res, next) => {
  try {
    const albumId = req.params.id;

   
    const album = await Album.findById(albumId);
    if (!album) {
      return ApiResponse.notFound(res, 'Album not found');
    }

    const result = await Like.toggleLike(req.user._id, 'album', albumId);

    if (result.liked) {
      album.stats.likes += 1;
    } else {
      album.stats.likes = Math.max(0, album.stats.likes - 1);
    }
    await album.save({ validateBeforeSave: false });

    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};


const toggleLikePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    const result = await Like.toggleLike(req.user._id, 'playlist', playlistId);


    if (result.liked) {
      playlist.stats.followers += 1;
    } else {
      playlist.stats.followers = Math.max(0, playlist.stats.followers - 1);
    }
    await playlist.save({ validateBeforeSave: false });

    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getLikedSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const likes = await Like.getUserLikedSongs(req.user._id, page, limit);
    const total = await Like.countDocuments({
      userId: req.user._id,
      itemType: 'song'
    });

    const songs = likes.map(like => ({
      ...like.itemId.toObject(),
      likedAt: like.createdAt
    }));

    return ApiResponse.paginated(res, songs, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getLikedAlbums = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const likes = await Like.getUserLikedAlbums(req.user._id, page, limit);
    const total = await Like.countDocuments({
      userId: req.user._id,
      itemType: 'album'
    });

    const albums = likes.map(like => ({
      ...like.itemId.toObject(),
      likedAt: like.createdAt
    }));

    return ApiResponse.paginated(res, albums, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getLikedPlaylists = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const likes = await Like.getUserLikedPlaylists(req.user._id, page, limit);
    const total = await Like.countDocuments({
      userId: req.user._id,
      itemType: 'playlist'
    });

    const playlists = likes.map(like => ({
      ...like.itemId.toObject(),
      likedAt: like.createdAt
    }));

    return ApiResponse.paginated(res, playlists, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const checkLikes = async (req, res, next) => {
  try {
    const { items } = req.body; 

    const results = {};

    for (const item of items) {
      const isLiked = await Like.isLiked(req.user._id, item.type, item.id);
      results[item.id] = isLiked;
    }

    return ApiResponse.success(res, results, 'Like status checked');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleLikeSong,
  toggleLikeAlbum,
  toggleLikePlaylist,
  getLikedSongs,
  getLikedAlbums,
  getLikedPlaylists,
  checkLikes
};