const { Artist, Song, Album, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadAudio, uploadImage, uploadProfilePicture, deleteFile } = require('../utils/cloudinaryUpload');


const createArtist = async (req, res, next) => {
  try {
    const { artistName, bio, genres, socialLinks } = req.body;

    const existingArtist = await Artist.findOne({ userId: req.user._id });
    if (existingArtist) {
      return ApiResponse.error(res, 'Artist profile already exists', 400);
    }

    const artist = await Artist.create({
      userId: req.user._id,
      artistName,
      bio,
      genres: genres ? JSON.parse(genres) : [],
      socialLinks: socialLinks ? JSON.parse(socialLinks) : {}
    });

    req.user.role = 'artist';
    await req.user.save();

    return ApiResponse.success(res, artist, 'Artist profile created', 201);
  } catch (error) {
    next(error);
  }
};


const getArtist = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id).populate('userId', 'name email createdAt');
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');
    return ApiResponse.success(res, artist, 'Artist retrieved');
  } catch (error) {
    next(error);
  }
};


const updateArtist = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');
    if (artist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized');
    }

    const { artistName, bio, genres, socialLinks } = req.body;
    if (artistName) artist.artistName = artistName;
    if (bio !== undefined) artist.bio = bio;
    if (genres) artist.genres = JSON.parse(genres);
    if (socialLinks) artist.socialLinks = JSON.parse(socialLinks);

    await artist.save();
    return ApiResponse.success(res, artist, 'Artist updated');
  } catch (error) {
    next(error);
  }
};


const updateArtistProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.error(res, 'Please upload an image', 400);
    const artist = await Artist.findById(req.params.id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');
    if (artist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized');
    }

    if (artist.profilePicture?.publicId) {
      await deleteFile(artist.profilePicture.publicId, 'image');
    }

    const result = await uploadProfilePicture(req.file.path);
    artist.profilePicture = { url: result.url, publicId: result.publicId };
    await artist.save();

    return ApiResponse.success(res, { profilePicture: artist.profilePicture.url }, 'Profile picture updated');
  } catch (error) {
    next(error);
  }
};


const updateArtistCoverImage = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.error(res, 'Please upload an image', 400);
    const artist = await Artist.findById(req.params.id);
    if (!artist) return ApiResponse.notFound(res, 'Artist not found');
    if (artist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized');
    }

    if (artist.coverImage?.publicId) {
      await deleteFile(artist.coverImage.publicId, 'image');
    }

    const result = await uploadImage(req.file.path, 'music-app/covers');
    artist.coverImage = { url: result.url, publicId: result.publicId };
    await artist.save();

    return ApiResponse.success(res, { coverImage: artist.coverImage.url }, 'Cover image updated');
  } catch (error) {
    next(error);
  }
};


const getArtistSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const songs = await Song.find({ artistId: req.params.id, isPublished: true, isActive: true })
      .sort({ releaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('albumId', 'title coverImage');

    const total = await Song.countDocuments({ artistId: req.params.id, isPublished: true, isActive: true });
    return ApiResponse.paginated(res, songs, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const getArtistAlbums = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const albums = await Album.find({ artistId: req.params.id, isPublished: true, isActive: true })
      .sort({ releaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Album.countDocuments({ artistId: req.params.id, isPublished: true, isActive: true });
    return ApiResponse.paginated(res, albums, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getFeaturedArtists = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const artists = await Artist.findFeatured(limit);
    return ApiResponse.success(res, artists, 'Featured artists retrieved');
  } catch (error) {
    next(error);
  }
};


const getPopularArtists = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const artists = await Artist.findPopular(limit);
    return ApiResponse.success(res, artists, 'Popular artists retrieved');
  } catch (error) {
    next(error);
  }
};


const artistUploadSong = async (req, res, next) => {
  try {
    const { title, albumId, genre, lyrics, language, isExplicit, featuring } = req.body;
    const artist = await Artist.findOne({ userId: req.user._id });
    if (!artist) return ApiResponse.forbidden(res, 'Artist profile not found for this user');

    if (!req.files || !req.files.audio) return ApiResponse.error(res, 'Audio required', 400);

    const audioResult = await uploadAudio(req.files.audio[0].path);
    let cover = null;
    if (req.files.cover) cover = await uploadImage(req.files.cover[0].path);

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
      coverImage: cover ? { url: cover.url, publicId: cover.publicId } : undefined,
      genre,
      lyrics,
      language,
      isExplicit: isExplicit === 'true' || isExplicit === true,
      featuring: featuring ? JSON.parse(featuring) : []
    });

    artist.stats.totalSongs = (artist.stats.totalSongs || 0) + 1;
    await artist.save();

    if (albumId) {
      const album = await Album.findById(albumId);
      if (album && album.artistId.toString() === artist._id.toString()) {
        album.tracks.push({ songId: song._id, position: album.tracks.length + 1 });
        await album.save();
      }
    }

    return ApiResponse.success(res, song, 'Song uploaded successfully');
  } catch (error) {
    next(error);
  }
};


const artistUploadAlbum = async (req, res, next) => {
  try {
    const artist = await Artist.findOne({ userId: req.user._id });
    if (!artist) return ApiResponse.forbidden(res, 'Artist profile not found');

    const { title, genre, releaseDate, recordLabel, tracksMetadata } = req.body;
    if (!title || !req.files || !req.files.songs)
      return ApiResponse.error(res, 'Title and songs are required', 400);

    let coverResult = null;
    if (req.files.cover) coverResult = await uploadImage(req.files.cover[0].path);

    const album = await Album.create({
      title,
      artistId: artist._id,
      genre,
      releaseDate: releaseDate || Date.now(),
      recordLabel,
      coverImage: coverResult ? { url: coverResult.url, publicId: coverResult.publicId } : undefined,
      tracks: []
    });

    const meta = tracksMetadata ? JSON.parse(tracksMetadata) : [];
    for (let i = 0; i < req.files.songs.length; i++) {
      const f = req.files.songs[i];
      const m = meta[i] || {};
      const audioResult = await uploadAudio(f.path);
      const song = await Song.create({
        title: m.title || `Track ${i + 1}`,
        artistId: artist._id,
        albumId: album._id,
        audioFile: {
          url: audioResult.url,
          publicId: audioResult.publicId,
          duration: audioResult.duration,
          format: audioResult.format,
          size: audioResult.bytes
        },
        coverImage: album.coverImage || undefined,
        genre: m.genre || genre,
        lyrics: m.lyrics || ''
      });
      album.tracks.push({ songId: song._id, position: i + 1 });
    }

    await album.save();

    artist.stats.totalAlbums = (artist.stats.totalAlbums || 0) + 1;
    artist.stats.totalSongs = (artist.stats.totalSongs || 0) + req.files.songs.length;
    await artist.save();

    return ApiResponse.success(res, album, 'Album uploaded successfully');
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createArtist,
  getArtist,
  updateArtist,
  updateArtistProfilePicture,
  updateArtistCoverImage,
  getArtistSongs,
  getArtistAlbums,
  getFeaturedArtists,
  getPopularArtists,
  artistUploadSong,
  artistUploadAlbum
};
