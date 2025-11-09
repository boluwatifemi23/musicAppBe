const { Song, Artist, Album, PlayHistory, Like } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadAudio, uploadImage, deleteFile } = require('../utils/cloudinaryUpload');
const { streamAudio } = require('../utils/streamAudio');

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

    const artist = await Artist.findOne({ _id: artistId, userId: req.user._id });
    if (!artist) {
      return ApiResponse.error(res, 'Artist not found or unauthorized', 404);
    }

    if (!req.files || !req.files.audio) {
      return ApiResponse.error(res, 'Audio file is required', 400);
    }

    const audioResult = await uploadAudio(req.files.audio[0].path);


    let coverImageResult = null;
    if (req.files.cover) {
      coverImageResult = await uploadImage(req.files.cover[0].path);
    }

 
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

   
    artist.stats.totalSongs += 1;
    await artist.save();

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


const getSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('artistId', 'artistName profilePicture bio')
      .populate('albumId', 'title coverImage releaseDate')
      .populate('featuring', 'artistName profilePicture');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

   
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


const streamSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song || !song.isPublished || !song.isActive) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    await streamAudio(song.audioFile.url, req, res);
  } catch (error) {
    next(error);
  }
};


const trackPlay = async (req, res, next) => {
  try {
    const { duration, completionPercentage, context } = req.body;
    const songId = req.params.id;

    const song = await Song.findById(songId);
    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    await song.incrementPlayCount();


    if (req.user) {
      await PlayHistory.create({
        userId: req.user._id,
        songId,
        duration: duration || 0,
        completionPercentage: completionPercentage || 0,
        context: context || { type: 'search' },
        device: req.headers['user-agent'] || 'web'
      });

     
      req.user.stats.totalPlays += 1;
      await req.user.save({ validateBeforeSave: false });
    }

  
    const artist = await Artist.findById(song.artistId);
    if (artist) {
      await artist.incrementPlayCount();
    }

    return ApiResponse.success(res, null, 'Play tracked successfully');
  } catch (error) {
    next(error);
  }
};


const getTrendingSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findTrending(limit);

    return ApiResponse.success(res, songs, 'Trending songs retrieved');
  } catch (error) {
    next(error);
  }
};

const getPopularSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findPopular(limit);

    return ApiResponse.success(res, songs, 'Popular songs retrieved');
  } catch (error) {
    next(error);
  }
};


const getNewReleases = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findNewReleases(limit);

    return ApiResponse.success(res, songs, 'New releases retrieved');
  } catch (error) {
    next(error);
  }
};


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


const updateSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).populate('artistId');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

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

    if (req.file) {
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


const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).populate('artistId');

    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    if (song.artistId.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this song');
    }

    await deleteFile(song.audioFile.publicId, 'video');
    if (song.coverImage.publicId) {
      await deleteFile(song.coverImage.publicId, 'image');
    }

    await song.deleteOne();

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

const getRecommendations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const recentPlays = await PlayHistory.find({ userId: req.user._id })
      .sort({ playedAt: -1 })
      .limit(50)
      .populate('songId');

    const genreCounts = {};
    recentPlays.forEach(play => {
      if (play.songId && play.songId.genre) {
        genreCounts[play.songId.genre] = (genreCounts[play.songId.genre] || 0) + 1;
      }
    });


    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);


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