const { Song, Album, Artist, Playlist, SearchHistory } = require('../models');
const ApiResponse = require('../utils/apiResponse');

const searchAll = async (req, res, next) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim().length === 0) {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    
    const [songs, albums, artists, playlists] = await Promise.all([
      Song.searchSongs(query, limit),
      Album.find({
        $text: { $search: query },
        isPublished: true,
        isActive: true
      })
        .limit(limit)
        .populate('artistId', 'artistName profilePicture'),
      
      Artist.searchArtists(query, limit),
      
      Playlist.searchPlaylists(query, limit)
    ]);

    if (req.user) {
      await SearchHistory.create({
        userId: req.user._id,
        query: query.trim(),
        resultType: 'all',
        resultCount: songs.length + albums.length + artists.length + playlists.length
      });
    }

    return ApiResponse.success(
      res,
      {
        songs,
        albums,
        artists,
        playlists
      },
      'Search results retrieved'
    );
  } catch (error) {
    next(error);
  }
};

const searchSongs = async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    const songs = await Song.searchSongs(query, limit)
      .skip((page - 1) * limit);


    if (req.user) {
      await SearchHistory.create({
        userId: req.user._id,
        query: query.trim(),
        resultType: 'song',
        resultCount: songs.length
      });
    }

    return ApiResponse.success(res, songs, 'Songs found');
  } catch (error) {
    next(error);
  }
};


const searchAlbums = async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    const albums = await Album.find({
      $text: { $search: query },
      isPublished: true,
      isActive: true
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('artistId', 'artistName profilePicture');

    if (req.user) {
      await SearchHistory.create({
        userId: req.user._id,
        query: query.trim(),
        resultType: 'album',
        resultCount: albums.length
      });
    }

    return ApiResponse.success(res, albums, 'Albums found');
  } catch (error) {
    next(error);
  }
};


const searchArtists = async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    const artists = await Artist.searchArtists(query, limit)
      .skip((page - 1) * limit);

    if (req.user) {
      await SearchHistory.create({
        userId: req.user._id,
        query: query.trim(),
        resultType: 'artist',
        resultCount: artists.length
      });
    }

    return ApiResponse.success(res, artists, 'Artists found');
  } catch (error) {
    next(error);
  }
};


const searchPlaylists = async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    const playlists = await Playlist.searchPlaylists(query, limit)
      .skip((page - 1) * limit);

    
    if (req.user) {
      await SearchHistory.create({
        userId: req.user._id,
        query: query.trim(),
        resultType: 'playlist',
        resultCount: playlists.length
      });
    }

    return ApiResponse.success(res, playlists, 'Playlists found');
  } catch (error) {
    next(error);
  }
};


const getSearchHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const history = await SearchHistory.getRecentSearches(req.user._id, limit);

    return ApiResponse.success(res, history, 'Search history retrieved');
  } catch (error) {
    next(error);
  }
};


const clearSearchHistory = async (req, res, next) => {
  try {
    await SearchHistory.clearUserHistory(req.user._id);

    return ApiResponse.success(res, null, 'Search history cleared');
  } catch (error) {
    next(error);
  }
};


const getTrendingSearches = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const trending = await SearchHistory.getTrendingSearches(limit, 24);

    return ApiResponse.success(res, trending, 'Trending searches retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchAll,
  searchSongs,
  searchAlbums,
  searchArtists,
  searchPlaylists,
  getSearchHistory,
  clearSearchHistory,
  getTrendingSearches
};