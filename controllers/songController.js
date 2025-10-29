// controllers/songController.js - Song Management Controller

const { Song, Artist, Album, PlayHistory, Like } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadAudio, uploadImage, deleteFile } = require('../utils/cloudinaryUpload');
const { streamAudio } = require('../utils/streamAudio');

// @desc    Create/Upload song
// @route   POST /api/songs
// @access  Private (Artist only)
const createSong = async (req, res, next) => {
  try {
    const {
      title,
      artistId,
      albumId,
      genre,
      lyrics,
      language,
      isExplicit,
      featuring
    } = req.body;

    // Verify artist exists and belongs to user
    const artist = await Artist.findOne({ _id: artistId, userId: req.user._id });
    if (!artist) {
      return ApiResponse.error(res, 'Artist not found or unauthorized', 404);
    }

    // Check if audio file is uploaded
    if (!req.files || !req.files.audio) {
      return ApiResponse.error(res, 'Audio file is required', 400);
    }

    // Upload audio file
    const audioResult = await uploadAudio(req.files.audio[0].path);

    // Upload cover image if provided
    let coverImageResult = null;
    if (req.files.cover) {
      coverImageResult = await uploadImage(req.files.cover[0].path);
    }

    // Create song
    const song = await Song.create({
      title,
      artistId,
      albumId: albumId || undefined,
      audioFile: {
        url: audioResult.url,
        publicId: audioResult.publicId,
        duration: audioResult.duration,
        format: audioResult.format,
        size: audioResult.bytes
      },
      coverImage: coverImageResult ? {
        url: coverImageResult.url,
        publicId: coverImageResult.publicId
      } : undefined,
      genre,
      lyrics,
      language,
      isExplicit: isExplicit === 'true' || isExplicit === true,
      featuring: featuring ? JSON.parse(featuring) : []
    });

    // Update artist stats
    artist.stats.totalSongs += 1;
    await artist.save();

    // Update album stats if song is part of an album
    if (albumId) {
      const album = await Album.findById(albumId);
      if (album) {
        await album.addTrack(song._id, album.tracks.length + 1);
      }
    }

    return ApiResponse.success(
      res,
      song,
      'Song uploaded successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get all songs (with filters)
// @route   GET /api/songs
// @access  Public
const getSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const genre = req.query.genre;
    const artistId = req.query.artistId;
    const albumId = req.query.albumId;

    const query = { isPublished: true, isActive: true };

    if (genre) query.genre = genre;
    if (artistId) query.artistId = artistId;
    if (albumId) query.albumId = albumId;

    const songs = await Song.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('artistId', 'artistName profilePicture')
      .populate('albumId', 'title coverImage');

    const total = await Song.countDocuments(query);

    return ApiResponse.paginated(res, songs, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single song
// @route   GET /api/songs/:id
// @access  Public
const getSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('artistId', 'artistName profilePicture bio')
      .populate('albumId', 'title coverImage releaseDate')
      .populate('featuring', 'artistName profilePicture');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Check if user liked this song
    let isLiked = false;
    if (req.user) {
      isLiked = await Like.isLiked(req.user._id, 'song', song._id);
    }

    return ApiResponse.success(
      res,
      {
        ...song.toObject(),
        isLiked
      },
      'Song retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Stream audio
// @route   GET /api/songs/stream/:id
// @access  Public
const streamSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song || !song.isPublished || !song.isActive) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Stream the audio file
    await streamAudio(song.audioFile.url, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Track song play
// @route   POST /api/songs/:id/play
// @access  Private/Optional
const trackPlay = async (req, res, next) => {
  try {
    const { duration, completionPercentage, context } = req.body;
    const songId = req.params.id;

    const song = await Song.findById(songId);
    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Increment play count
    await song.incrementPlayCount();

    // If user is logged in, save to play history
    if (req.user) {
      await PlayHistory.create({
        userId: req.user._id,
        songId,
        duration: duration || 0,
        completionPercentage: completionPercentage || 0,
        context: context || { type: 'search' },
        device: req.headers['user-agent'] || 'web'
      });

      // Update user stats
      req.user.stats.totalPlays += 1;
      await req.user.save({ validateBeforeSave: false });
    }

    // Update artist play count
    const artist = await Artist.findById(song.artistId);
    if (artist) {
      await artist.incrementPlayCount();
    }

    return ApiResponse.success(res, null, 'Play tracked successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending songs
// @route   GET /api/songs/trending
// @access  Public
const getTrendingSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findTrending(limit);

    return ApiResponse.success(res, songs, 'Trending songs retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular songs
// @route   GET /api/songs/popular
// @access  Public
const getPopularSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findPopular(limit);

    return ApiResponse.success(res, songs, 'Popular songs retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Get new releases
// @route   GET /api/songs/new-releases
// @access  Public
const getNewReleases = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findNewReleases(limit);

    return ApiResponse.success(res, songs, 'New releases retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Get songs by genre
// @route   GET /api/songs/genre/:genre
// @access  Public
const getSongsByGenre = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findByGenre(req.params.genre, limit);

    return ApiResponse.success(
      res,
      songs,
      `Songs in ${req.params.genre} genre retrieved`
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update song
// @route   PUT /api/songs/:id
// @access  Private (Artist only)
const updateSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).populate('artistId');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Check if user owns this song
    if (song.artistId.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized to update this song');
    }

    const { title, genre, lyrics, language, isExplicit, isPublished } = req.body;

    if (title) song.title = title;
    if (genre) song.genre = genre;
    if (lyrics !== undefined) song.lyrics = lyrics;
    if (language) song.language = language;
    if (isExplicit !== undefined) song.isExplicit = isExplicit;
    if (isPublished !== undefined) song.isPublished = isPublished;

    // Update cover image if provided
    if (req.file) {
      // Delete old cover
      if (song.coverImage.publicId) {
        await deleteFile(song.coverImage.publicId, 'image');
      }

      const coverResult = await uploadImage(req.file.path);
      song.coverImage = {
        url: coverResult.url,
        publicId: coverResult.publicId
      };
    }

    await song.save();

    return ApiResponse.success(res, song, 'Song updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete song
// @route   DELETE /api/songs/:id
// @access  Private (Artist only)
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).populate('artistId');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Check if user owns this song
    if (song.artistId.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this song');
    }

    // Delete files from Cloudinary
    await deleteFile(song.audioFile.publicId, 'video'); // Audio uses 'video' type
    if (song.coverImage.publicId) {
      await deleteFile(song.coverImage.publicId, 'image');
    }

    // Delete song
    await song.deleteOne();

    // Update artist stats
    const artist = await Artist.findById(song.artistId);
    if (artist) {
      artist.stats.totalSongs = Math.max(0, artist.stats.totalSongs - 1);
      await artist.save();
    }

    return ApiResponse.success(res, null, 'Song deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get recommended songs for user
// @route   GET /api/songs/recommendations
// @access  Private
const getRecommendations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get user's top genres from play history
    const recentPlays = await PlayHistory.find({ userId: req.user._id })
      .sort({ playedAt: -1 })
      .limit(50)
      .populate('songId');

    // Extract genres
    const genreCounts = {};
    recentPlays.forEach(play => {
      if (play.songId && play.songId.genre) {
        genreCounts[play.songId.genre] = (genreCounts[play.songId.genre] || 0) + 1;
      }
    });

    // Get top 3 genres
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    // Get songs from those genres (excluding already played)
    const playedSongIds = recentPlays.map(play => play.songId?._id).filter(Boolean);

    const recommendations = await Song.find({
      genre: { $in: topGenres },
      _id: { $nin: playedSongIds },
      isPublished: true,
      isActive: true
    })
      .sort({ 'stats.plays': -1 })
      .limit(limit)
      .populate('artistId', 'artistName profilePicture')
      .populate('albumId', 'title coverImage');

    return ApiResponse.success(
      res,
      recommendations,
      'Recommendations retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSong,
  getSongs,
  getSong,
  streamSong,
  trackPlay,
  getTrendingSongs,
  getPopularSongs,
  getNewReleases,
  getSongsByGenre,
  updateSong,
  deleteSong,
  getRecommendations
};