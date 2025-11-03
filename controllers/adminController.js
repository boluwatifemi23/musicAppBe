// controllers/adminController.js
const { User, Artist, Song, Album } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadAudio, uploadImage, uploadProfilePicture, deleteFile } = require('../utils/cloudinaryUpload');
const mongoose = require('mongoose');


const adminUploadSong = async (req, res, next) => {
  try {
    const { title, artistId, albumId, genre, lyrics, language, isExplicit, featuring } = req.body;

    if (!title || !artistId || !req.files || !req.files.audio) {
      return ApiResponse.error(res, 'title, artistId and audio file required', 400);
    }

    // Optional: verify artist exists
    const artist = await Artist.findById(artistId);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    // Upload audio and cover if present
    const audioResult = await uploadAudio(req.files.audio[0].path);
    let coverResult = null;
    if (req.files.cover) {
      coverResult = await uploadImage(req.files.cover[0].path);
    }

    const song = await Song.create({
      title,
      artistId: artist._id,
      albumId: albumId || undefined,
      audioFile: {
        url: audioResult.url,
        publicId: audioResult.publicId,
        duration: audioResult.duration,
        format: audioResult.format,
        size: audioResult.bytes
      },
      coverImage: coverResult ? { url: coverResult.url, publicId: coverResult.publicId } : undefined,
      genre,
      lyrics,
      language,
      isExplicit: isExplicit === 'true' || isExplicit === true,
      featuring: featuring ? JSON.parse(featuring) : []
    });

    // update artist stats
    artist.stats = artist.stats || { totalSongs: 0, totalAlbums: 0, totalFollowers: 0 };
    artist.stats.totalSongs = (artist.stats.totalSongs || 0) + 1;
    await artist.save();

    return ApiResponse.success(res, song, 'Song uploaded by admin', 201);
  } catch (err) {
    next(err);
  }
};

// Bulk album upload (album metadata + many songs files)
const adminUploadAlbumBulk = async (req, res, next) => {
  try {
    // expected fields: title, artistId, genre, releaseDate, recordLabel, tracksMetadata (JSON array of {title, featuring, lyrics,...})
    // files: cover (single), songs (multiple audio files in same order as tracksMetadata)
    const { title, artistId, genre, releaseDate, recordLabel, tracksMetadata } = req.body;
    if (!title || !artistId || !req.files || !req.files.songs) {
      return ApiResponse.error(res, 'title, artistId and song files required', 400);
    }

    const tracksMeta = tracksMetadata ? JSON.parse(tracksMetadata) : [];
    const songFiles = req.files.songs;

    // create album cover
    let coverResult = null;
    if (req.files.cover && req.files.cover[0]) {
      coverResult = await uploadImage(req.files.cover[0].path, 'music-app/albums');
    }

    // Create album doc first
    const album = await Album.create({
      title,
      artistId,
      genre,
      releaseDate: releaseDate || Date.now(),
      recordLabel,
      coverImage: coverResult ? { url: coverResult.url, publicId: coverResult.publicId } : undefined,
      tracks: []
    });

    // For each song file, upload and create Song, then add to album.tracks
    for (let i = 0; i < songFiles.length; i++) {
      const file = songFiles[i];
      const meta = tracksMeta[i] || {};
      const audioResult = await uploadAudio(file.path);

      const songDoc = await Song.create({
        title: meta.title || `Track ${i + 1}`,
        artistId,
        albumId: album._id,
        audioFile: {
          url: audioResult.url,
          publicId: audioResult.publicId,
          duration: audioResult.duration,
          format: audioResult.format,
          size: audioResult.bytes
        },
        coverImage: album.coverImage ? album.coverImage : undefined,
        genre: meta.genre || genre,
        lyrics: meta.lyrics || '',
        language: meta.language || 'unknown',
        isExplicit: meta.isExplicit || false,
        featuring: meta.featuring ? meta.featuring : []
      });

      album.tracks.push({ songId: songDoc._id, position: i + 1 });
    }

    await album.save();

    // update artist stats
    const artist = await Artist.findById(artistId);
    if (artist) {
      artist.stats.totalAlbums = (artist.stats.totalAlbums || 0) + 1;
      artist.stats.totalSongs = (artist.stats.totalSongs || 0) + songFiles.length;
      await artist.save();
    }

    return ApiResponse.success(res, album, 'Album and tracks uploaded by admin', 201);
  } catch (err) {
    next(err);
  }
};

// Manage artists (CRUD)
const createArtistByAdmin = async (req, res, next) => {
  try {
    const { artistName, bio, genres, socialLinks, userId } = req.body;
    if (!artistName) return ApiResponse.error(res, 'artistName required', 400);

    const artist = await Artist.create({
      userId: userId ? mongoose.Types.ObjectId(userId) : undefined,
      artistName,
      bio,
      genres: genres ? JSON.parse(genres) : [],
      socialLinks: socialLinks ? JSON.parse(socialLinks) : {}
    });

    // optionally set user's role
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.role = 'artist';
        await user.save();
      }
    }

    return ApiResponse.success(res, artist, 'Artist created by admin', 201);
  } catch (err) { next(err); }
};

const updateArtistByAdmin = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    const { artistName, bio, genres, socialLinks, isActive } = req.body;
    if (artistName) artist.artistName = artistName;
    if (bio !== undefined) artist.bio = bio;
    if (genres) artist.genres = JSON.parse(genres);
    if (socialLinks) artist.socialLinks = JSON.parse(socialLinks);
    if (isActive !== undefined) artist.isActive = isActive;

    await artist.save();
    return ApiResponse.success(res, artist, 'Artist updated');
  } catch (err) { next(err); }
};

const deleteArtistByAdmin = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');

    // optionally remove their songs/albums or mark inactive — here we delete
    // delete album covers and audio files
    const albums = await Album.find({ artistId: artist._id });
    for (const album of albums) {
      if (album.coverImage && album.coverImage.publicId) {
        await deleteFile(album.coverImage.publicId, 'image');
      }
      // delete tracks' audio if stored on Cloudinary
      for (const t of album.tracks) {
        const s = await Song.findById(t.songId);
        if (s && s.audioFile && s.audioFile.publicId) {
          await deleteFile(s.audioFile.publicId, 'video');
        }
        if (s) await s.deleteOne();
      }
      await album.deleteOne();
    }

    // delete standalone songs
    const songs = await Song.find({ artistId: artist._id });
    for (const s of songs) {
      if (s.audioFile && s.audioFile.publicId) await deleteFile(s.audioFile.publicId, 'video');
      await s.deleteOne();
    }

    await artist.deleteOne();

    return ApiResponse.success(res, null, 'Artist and related content deleted');
  } catch (err) { next(err); }
};

// Manage songs (admin CRUD)
const adminGetSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).populate('artistId albumId');
    if (!song) return ApiResponse.notFound(res, 'Song not found');
    return ApiResponse.success(res, song, 'Song retrieved');
  } catch (err) { next(err); }
};

const adminUpdateSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return ApiResponse.notFound(res, 'Song not found');

    const { title, genre, lyrics, isPublished } = req.body;
    if (title) song.title = title;
    if (genre) song.genre = genre;
    if (lyrics !== undefined) song.lyrics = lyrics;
    if (isPublished !== undefined) song.isPublished = isPublished;

    // replace audio or cover if files provided
    if (req.files && req.files.audio) {
      if (song.audioFile && song.audioFile.publicId) await deleteFile(song.audioFile.publicId, 'video');
      const audioResult = await uploadAudio(req.files.audio[0].path);
      song.audioFile = {
        url: audioResult.url, publicId: audioResult.publicId, duration: audioResult.duration, format: audioResult.format, size: audioResult.bytes
      };
    }
    if (req.files && req.files.cover) {
      if (song.coverImage && song.coverImage.publicId) await deleteFile(song.coverImage.publicId, 'image');
      const cover = await uploadImage(req.files.cover[0].path);
      song.coverImage = { url: cover.url, publicId: cover.publicId };
    }

    await song.save();
    return ApiResponse.success(res, song, 'Song updated by admin');
  } catch (err) { next(err); }
};

const adminDeleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return ApiResponse.notFound(res, 'Song not found');

    // delete files from cloud
    if (song.audioFile && song.audioFile.publicId) await deleteFile(song.audioFile.publicId, 'video');
    if (song.coverImage && song.coverImage.publicId) await deleteFile(song.coverImage.publicId, 'image');

    await song.deleteOne();
    return ApiResponse.success(res, null, 'Song deleted by admin');
  } catch (err) { next(err); }
};

// Manage albums (admin CRUD)
const adminGetAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate('artistId tracks.songId');
    if (!album) return ApiResponse.notFound(res, 'Album not found');
    return ApiResponse.success(res, album, 'Album retrieved');
  } catch (err) { next(err); }
};

const adminUpdateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return ApiResponse.notFound(res, 'Album not found');

    const { title, genre, releaseDate, recordLabel, isPublished } = req.body;
    if (title) album.title = title;
    if (genre) album.genre = genre;
    if (releaseDate) album.releaseDate = releaseDate;
    if (recordLabel) album.recordLabel = recordLabel;
    if (isPublished !== undefined) album.isPublished = isPublished;

    if (req.files && req.files.cover) {
      if (album.coverImage && album.coverImage.publicId) await deleteFile(album.coverImage.publicId, 'image');
      const cover = await uploadImage(req.files.cover[0].path);
      album.coverImage = { url: cover.url, publicId: cover.publicId };
    }

    await album.save();
    return ApiResponse.success(res, album, 'Album updated by admin');
  } catch (err) { next(err); }
};

const adminDeleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return ApiResponse.notFound(res, 'Album not found');

    // delete cover and each track files
    if (album.coverImage && album.coverImage.publicId) await deleteFile(album.coverImage.publicId, 'image');

    for (const t of album.tracks) {
      const s = await Song.findById(t.songId);
      if (s) {
        if (s.audioFile && s.audioFile.publicId) await deleteFile(s.audioFile.publicId, 'video');
        if (s.coverImage && s.coverImage.publicId) await deleteFile(s.coverImage.publicId, 'image');
        await s.deleteOne();
      }
    }

    await album.deleteOne();

    // update artist stats
    const artist = await Artist.findById(album.artistId);
    if (artist) {
      artist.stats.totalAlbums = Math.max(0, (artist.stats.totalAlbums || 1) - 1);
      await artist.save();
    }

    return ApiResponse.success(res, null, 'Album deleted by admin');
  } catch (err) { next(err); }
};

// View all content (Admin dashboard view)
const viewAllContent = async (req, res, next) => {
  try {
    // pagination and filters optional
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const [songs, albums, artists, users] = await Promise.all([
      Song.find().skip((page - 1) * limit).limit(limit).populate('artistId albumId'),
      Album.find().skip((page - 1) * limit).limit(limit).populate('artistId'),
      Artist.find().skip((page - 1) * limit).limit(limit),
      User.find().skip((page - 1) * limit).limit(limit).select('-password')
    ]);

    return ApiResponse.success(res, { songs, albums, artists, users }, 'All content retrieved');
  } catch (err) { next(err); }
};

module.exports = {
  adminUploadSong,
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
  viewAllContent
};
