const { Album, Artist, Song } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadImage, deleteFile } = require('../utils/cloudinaryUpload');


const createAlbum = async (req, res, next) => {
  try {
    const {
      title,
      artistId,
      description,
      genre,
      releaseDate,
      recordLabel,
      type
    } = req.body;

    
    const artist = await Artist.findOne({ _id: artistId, userId: req.user._id });
    if (!artist) {
      return ApiResponse.error(res, 'Artist not found or unauthorized', 404);
    }


    let coverImageResult = null;
    if (req.file) {
      coverImageResult = await uploadImage(req.file.path, 'music-app/albums');
    }

    const album = await Album.create({
      title,
      artistId,
      description,
      genre,
      releaseDate: releaseDate || Date.now(),
      recordLabel,
      type: type || 'album',
      coverImage: coverImageResult ? {
        url: coverImageResult.url,
        publicId: coverImageResult.publicId
      } : undefined
    });

 
    artist.stats.totalAlbums += 1;
    await artist.save();

    return ApiResponse.success(res, album, 'Album created', 201);
  } catch (error) {
    next(error);
  }
};


const getAlbums = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const genre = req.query.genre;
    const artistId = req.query.artistId;
    const type = req.query.type;

    const query = { isPublished: true, isActive: true };

    if (genre) query.genre = genre;
    if (artistId) query.artistId = artistId;
    if (type) query.type = type;

    const albums = await Album.find(query)
      .sort({ releaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('artistId', 'artistName profilePicture');

    const total = await Album.countDocuments(query);

    return ApiResponse.paginated(res, albums, page, limit, total);
  } catch (error) {
    next(error);
  }
};


const getAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('artistId', 'artistName profilePicture bio')
      .populate({
        path: 'tracks.songId',
        select: 'title audioFile coverImage stats'
      });

    if (!album) {
      return ApiResponse.notFound(res, 'Album not found');
    }

    return ApiResponse.success(res, album, 'Album retrieved');
  } catch (error) {
    next(error);
  }
};


const updateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate('artistId');

    if (!album) {
      return ApiResponse.notFound(res, 'Album not found');
    }


    if (album.artistId.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized');
    }

    const { title, description, genre, releaseDate, recordLabel, type, isPublished, isTrending } = req.body;

    if (title) album.title = title;
    if (description !== undefined) album.description = description;
    if (genre) album.genre = genre;
    if (releaseDate) album.releaseDate = releaseDate;
    if (recordLabel) album.recordLabel = recordLabel;
    if (type) album.type = type;
    if (isPublished !== undefined) album.isPublished = isPublished;
    if (isTrending !== undefined) album.isTrending = isTrending;

    
    if (req.file) {
      if (album.coverImage.publicId) {
        await deleteFile(album.coverImage.publicId, 'image');
      }

      const coverResult = await uploadImage(req.file.path, 'music-app/albums');
      album.coverImage = {
        url: coverResult.url,
        publicId: coverResult.publicId
      };
    }

    await album.save();

    return ApiResponse.success(res, album, 'Album updated');
  } catch (error) {
    next(error);
  }
};


const deleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate('artistId');

    if (!album) {
      return ApiResponse.notFound(res, 'Album not found');
    }

   
    if (album.artistId.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized');
    }

  
    if (album.coverImage.publicId) {
      await deleteFile(album.coverImage.publicId, 'image');
    }

    
    await album.deleteOne();

    
    const artist = await Artist.findById(album.artistId);
    if (artist) {
      artist.stats.totalAlbums = Math.max(0, artist.stats.totalAlbums - 1);
      await artist.save();
    }

    return ApiResponse.success(res, null, 'Album deleted');
  } catch (error) {
    next(error);
  }
};


const getNewReleases = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const albums = await Album.findNewReleases(limit);

    return ApiResponse.success(res, albums, 'New releases retrieved');
  } catch (error) {
    next(error);
  }
};


const getPopularAlbums = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const albums = await Album.findPopular(limit);

    return ApiResponse.success(res, albums, 'Popular albums retrieved');
  } catch (error) {
    next(error);
  }
};

const getTrendingAlbums = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const albums = await Album.findTrending(limit);

    return ApiResponse.success(res, albums, 'Trending albums retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAlbum,
  getAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
  getNewReleases,
  getPopularAlbums,
  getTrendingAlbums
};
