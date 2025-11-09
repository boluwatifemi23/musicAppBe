const { User, Artist, Song, Album } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadAudio, uploadImage, uploadProfilePicture, deleteFile } = require('../utils/cloudinaryUpload');
const mongoose = require('mongoose');

const adminUploadSong = async (req, res, next) => {
  try {
    const { title, artistId, genre, albumId } = req.body;

    if (!title || !artistId) {
      return ApiResponse.error(res, 'Title and artist are required', 400);
    }

    const artist = await Artist.findById(artistId);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    const songFile = req.files?.songFile?.[0];
    const coverImage = req.files?.coverImage?.[0];

    const audioUpload = songFile ? await uploadAudio(songFile.path) : null;
    const imageUpload = coverImage ? await uploadImage(coverImage.path) : null;

    const song = await Song.create({
      title,
      artist: artistId,
      genre,
      album: albumId || null,
      audioUrl: audioUpload?.secure_url,
      coverImage: imageUpload?.secure_url,
      uploadedByAdmin: true,
    });

    return ApiResponse.success(res, song, 'Song uploaded successfully');
  } catch (err) {
    next(err);
  }
};

const addSongWithUrl = async (req, res, next) => {
  try {
    const {
      title,
      artistId,
      audioUrl,
      coverUrl,
      genre,
      lyrics,
      language,
      duration,
      isExplicit
    } = req.body;

    if (!title || !artistId || !audioUrl) {
      return ApiResponse.error(res, 'title, artistId and audioUrl required', 400);
    }

    const artist = await Artist.findById(artistId);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    const song = await Song.create({
      title,
      artistId,
      audioFile: {
        url: audioUrl,
        publicId: 'external-' + Date.now(),
        duration: duration || 180, 
        format: 'mp3',
        size: 0
      },
      coverImage: coverUrl ? {
        url: coverUrl,
        publicId: 'external-cover-' + Date.now()
      } : undefined,
      genre: genre || 'Pop',
      lyrics: lyrics || '',
      language: language || 'English',
      isExplicit: isExplicit || false
    });

    artist.stats.totalSongs = (artist.stats.totalSongs || 0) + 1;
    await artist.save();

    return ApiResponse.success(res, song, 'Song added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const bulkAddSongsWithUrl = async (req, res, next) => {
  try {
    const { songs, artistId } = req.body;

    if (!Array.isArray(songs) || songs.length === 0) {
      return ApiResponse.error(res, 'songs array is required', 400);
    }

    const artist = await Artist.findById(artistId);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    const createdSongs = [];

    for (const songData of songs) {
      const song = await Song.create({
        title: songData.title,
        artistId,
        audioFile: {
          url: songData.audioUrl,
          publicId: 'external-' + Date.now() + Math.random(),
          duration: songData.duration || 180,
          format: 'mp3',
          size: 0
        },
        coverImage: songData.coverUrl ? {
          url: songData.coverUrl,
          publicId: 'external-cover-' + Date.now() + Math.random()
        } : undefined,
        genre: songData.genre || 'Pop',
        language: songData.language || 'English',
        isExplicit: songData.isExplicit || false
      });

      createdSongs.push(song);
    }

    artist.stats = artist.stats || { totalSongs: 0 };
    artist.stats.totalSongs = (artist.stats.totalSongs || 0) + createdSongs.length;
    await artist.save();

    return ApiResponse.success(res, createdSongs, `${createdSongs.length} songs added successfully`, 201);
  } catch (err) {
    next(err);
  }
};


const adminUploadAlbumBulk = async (req, res, next) => {
  try {
    const { albums } = req.body;
    if (!Array.isArray(albums) || albums.length === 0) {
      return ApiResponse.error(res, 'Albums array required', 400);
    }

    const newAlbums = await Album.insertMany(albums);
    return ApiResponse.success(res, newAlbums, `${newAlbums.length} albums added`);
  } catch (err) {
    next(err);
  }
};

const createArtistByAdmin = async (req, res, next) => {
  try {
    const { userId, artistName, bio, genres } = req.body;

    const user = await User.findById(userId);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    const existingArtist = await Artist.findOne({ userId });
    if (existingArtist) return ApiResponse.error(res, 'User is already an artist', 400);

    let profilePictureUrl = null;
    if (req.file) {
      const uploadResult = await uploadProfilePicture(req.file.path);
      profilePictureUrl = uploadResult.secure_url;
    }

    const artist = await Artist.create({
      userId,
      artistName,
      bio,
      genres,
      profilePicture: profilePictureUrl,
      approvedByAdmin: true,
      verified: true,
    });

    return ApiResponse.success(res, artist, 'Artist profile created by admin');
  } catch (err) {
    next(err);
  }
};

const updateArtistByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const artist = await Artist.findByIdAndUpdate(id, updateData, { new: true });
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    return ApiResponse.success(res, artist, 'Artist updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteArtistByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const artist = await Artist.findByIdAndDelete(id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    return ApiResponse.success(res, artist, 'Artist deleted successfully');
  } catch (err) {
    next(err);
  }
};


const toggleFeaturedArtist = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.isFeatured = !artist.isFeatured;
    artist.featuredAt = artist.isFeatured ? Date.now() : undefined;

    await artist.save();

    return ApiResponse.success(
      res,
      {
        _id: artist._id,
        artistName: artist.artistName,
        isFeatured: artist.isFeatured,
        featuredAt: artist.featuredAt
      },
      artist.isFeatured ? 'Artist featured successfully' : 'Artist unfeatured successfully'
    );
  } catch (err) {
    next(err);
  }
};

const bulkSetFeaturedArtists = async (req, res, next) => {
  try {
    const { artistIds, replaceAll } = req.body;

    if (!Array.isArray(artistIds) || artistIds.length === 0) {
      return ApiResponse.error(res, 'artistIds array is required', 400);
    }

    if (replaceAll === true) {
      await Artist.updateMany({}, { isFeatured: false, featuredAt: undefined });
    }

    const result = await Artist.updateMany(
      { _id: { $in: artistIds } },
      { isFeatured: true, featuredAt: Date.now() }
    );

    const updatedArtists = await Artist.find({ _id: { $in: artistIds } })
      .select('artistName profilePicture isFeatured featuredAt');

    return ApiResponse.success(
      res,
      { modifiedCount: result.modifiedCount, artists: updatedArtists },
      `${result.modifiedCount} artists set as featured`
    );
  } catch (err) {
    next(err);
  }
};

const getFeaturedArtistsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const artists = await Artist.find({ isFeatured: true })
      .sort({ featuredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await Artist.countDocuments({ isFeatured: true });

    return ApiResponse.paginated(res, artists, page, limit, total, 'Featured artists retrieved');
  } catch (err) {
    next(err);
  }
};

const reorderFeaturedArtists = async (req, res, next) => {
  try {
    const { orderedArtistIds } = req.body;

    if (!Array.isArray(orderedArtistIds)) {
      return ApiResponse.error(res, 'orderedArtistIds array is required', 400);
    }

    const baseTime = Date.now();
    const updates = orderedArtistIds.map((artistId, index) => {
      const timestamp = baseTime + (orderedArtistIds.length - index) * 1000;
      return Artist.findByIdAndUpdate(
        artistId,
        { isFeatured: true, featuredAt: new Date(timestamp) },
        { new: true }
      );
    });

    const updatedArtists = await Promise.all(updates);

    return ApiResponse.success(
      res,
      {
        count: updatedArtists.filter(a => a).length,
        artists: updatedArtists.filter(a => a).map(a => ({
          _id: a._id,
          artistName: a.artistName,
          featuredAt: a.featuredAt
        }))
      },
      'Featured artists reordered successfully'
    );
  } catch (err) {
    next(err);
  }
};


const adminGetSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return ApiResponse.notFound(res, 'Song not found');
    return ApiResponse.success(res, song);
  } catch (err) {
    next(err);
  }
};

const adminUpdateSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!song) return ApiResponse.notFound(res, 'Song not found');
    return ApiResponse.success(res, song, 'Song updated successfully');
  } catch (err) {
    next(err);
  }
};

const adminDeleteSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return ApiResponse.notFound(res, 'Song not found');
    return ApiResponse.success(res, song, 'Song deleted successfully');
  } catch (err) {
    next(err);
  }
};

const adminGetAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return ApiResponse.notFound(res, 'Album not found');
    return ApiResponse.success(res, album);
  } catch (err) {
    next(err);
  }
};

const adminUpdateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!album) return ApiResponse.notFound(res, 'Album not found');
    return ApiResponse.success(res, album, 'Album updated successfully');
  } catch (err) {
    next(err);
  }
};

const adminDeleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    if (!album) return ApiResponse.notFound(res, 'Album not found');
    return ApiResponse.success(res, album, 'Album deleted successfully');
  } catch (err) {
    next(err);
  }
};


const viewAllContent = async (req, res, next) => {
  try {
    const songs = await Song.find().populate('artist', 'artistName');
    const albums = await Album.find().populate('artist', 'artistName');
    const artists = await Artist.find();
    return ApiResponse.success(res, { songs, albums, artists });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  adminUploadSong,
  addSongWithUrl,
  bulkAddSongsWithUrl,
  adminUploadAlbumBulk,
  createArtistByAdmin,
  updateArtistByAdmin,
  deleteArtistByAdmin,
  adminGetSong,
  adminUpdateSong,
  adminDeleteSong,
  adminGetAlbum,
  adminUpdateAlbum,
  adminDeleteAlbum,
  viewAllContent,
  toggleFeaturedArtist,
  bulkSetFeaturedArtists,
  getFeaturedArtistsAdmin,
  reorderFeaturedArtists
};
