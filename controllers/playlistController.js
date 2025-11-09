
const { Playlist, Song, Like } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadImage, deleteFile } = require('../utils/cloudinaryUpload');

const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic, isCollaborative } = req.body;

    const playlist = await Playlist.create({
      name,
      description,
      userId: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true,
      isCollaborative: isCollaborative || false
    });

    req.user.stats.totalPlaylistsCreated += 1;
    await req.user.save({ validateBeforeSave: false });

    return ApiResponse.success(
      res,
      playlist,
      'Playlist created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};


const getUserPlaylists = async (req, res, next) => {
  const{id}= req.params.id
  try {
    const playlists = await Playlist.findUserPlaylists(id);

    return ApiResponse.success(
      res,
      playlists,
      'Playlists retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};


const getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('userId', 'name profilePicture')
      .populate({
        path: 'songs.songId',
        populate: { path: 'artistId', select: 'artistName profilePicture' }
      });

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.isPublic && 
        (!req.user || req.user._id.toString() !== playlist.userId._id.toString())) {
      return ApiResponse.forbidden(res, 'This playlist is private');
    }

    let isFollowing = false;
    if (req.user) {
      const Like = require('../models/Like');
      isFollowing = await Like.isLiked(req.user._id, 'playlist', playlist._id);
    }

    return ApiResponse.success(
      res,
      {
        ...playlist.toObject(),
        isFollowing,
        canEdit: req.user ? playlist.canEdit(req.user._id) : false
      },
      'Playlist retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};


const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    const { name, description, isPublic, isCollaborative } = req.body;

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (isCollaborative !== undefined) playlist.isCollaborative = isCollaborative;

    await playlist.save();

    return ApiResponse.success(res, playlist, 'Playlist updated successfully');
  } catch (error) {
    next(error);
  }
};


const updatePlaylistCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an image', 400);
    }

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

   
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }


    if (playlist.coverImage.publicId) {
      await deleteFile(playlist.coverImage.publicId, 'image');
    }


    const result = await uploadImage(req.file.path);

    playlist.coverImage = {
      url: result.url,
      publicId: result.publicId
    };

    await playlist.save();

    return ApiResponse.success(
      res,
      { coverImage: playlist.coverImage.url },
      'Playlist cover updated successfully'
    );
  } catch (error) {
    next(error);
  }
};


const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

 
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this playlist');
    }

   
    if (playlist.coverImage.publicId) {
      await deleteFile(playlist.coverImage.publicId, 'image');
    }

    await playlist.deleteOne();

  
    req.user.stats.totalPlaylistsCreated = Math.max(
      0,
      req.user.stats.totalPlaylistsCreated - 1
    );
    await req.user.save({ validateBeforeSave: false });

    return ApiResponse.success(res, null, 'Playlist deleted successfully');
  } catch (error) {
    next(error);
  }
};


const addSongToPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    const song = await Song.findById(songId);
    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    await playlist.addSong(songId);

    return ApiResponse.success(res, playlist, 'Song added to playlist');
  } catch (error) {
    if (error.message === 'Song already in playlist') {
      return ApiResponse.error(res, error.message, 400);
    }
    next(error);
  }
};

const addMultipleSongsToPlaylist = async (req, res, next) => {
  try {
    const { songIds } = req.body;

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return ApiResponse.error(res, 'songIds array is required', 400);
    }

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    const addedSongs = [];
    const skippedSongs = [];
    const notFoundSongs = [];

    for (const songId of songIds) {
      
      const song = await Song.findById(songId);
      if (!song) {
        notFoundSongs.push(songId);
        continue;
      }

      
      const exists = playlist.songs.some(s => s.songId.toString() === songId.toString());
      if (exists) {
        skippedSongs.push({
          songId,
          reason: 'Already in playlist'
        });
        continue;
      }

     
      playlist.songs.push({ songId, addedAt: Date.now() });
      addedSongs.push(songId);
    }

    await playlist.save();
    await playlist.updateStats();

    return ApiResponse.success(
      res,
      {
        playlist,
        summary: {
          total: songIds.length,
          added: addedSongs.length,
          skipped: skippedSongs.length,
          notFound: notFoundSongs.length
        },
        details: {
          addedSongs,
          skippedSongs,
          notFoundSongs
        }
      },
      `${addedSongs.length} songs added to playlist`
    );
  } catch (error) {
    next(error);
  }
};

const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    await playlist.removeSong(req.params.songId);

    return ApiResponse.success(res, playlist, 'Song removed from playlist');
  } catch (error) {
    next(error);
  }
};

const removeMultipleSongsFromPlaylist = async (req, res, next) => {
  try {
    const { songIds } = req.body;

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return ApiResponse.error(res, 'songIds array is required', 400);
    }

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    const originalCount = playlist.songs.length;

    playlist.songs = playlist.songs.filter(
      s => !songIds.includes(s.songId.toString())
    );

    const removedCount = originalCount - playlist.songs.length;

    await playlist.save();
    await playlist.updateStats();

    return ApiResponse.success(
      res,
      {
        playlist,
        removedCount
      },
      `${removedCount} songs removed from playlist`
    );
  } catch (error) {
    next(error);
  }
};

const reorderPlaylist = async (req, res, next) => {
  try {
    const { songOrder } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    await playlist.reorderSongs(songOrder);

    return ApiResponse.success(res, playlist, 'Playlist reordered successfully');
  } catch (error) {
    next(error);
  }
};


const getPublicPlaylists = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const playlists = await Playlist.findPublicPlaylists(limit);

    return ApiResponse.success(res, playlists, 'Public playlists retrieved');
  } catch (error) {
    next(error);
  }
};


const getCuratedPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.findSystemPlaylists();

    return ApiResponse.success(res, playlists, 'Curated playlists retrieved');
  } catch (error) {
    next(error);
  }
};


const addCollaborator = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (playlist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Only playlist owner can add collaborators');
    }

    await playlist.addCollaborator(userId);

    return ApiResponse.success(res, playlist, 'Collaborator added successfully');
  } catch (error) {
    if (error.message === 'Playlist is not collaborative') {
      return ApiResponse.error(res, error.message, 400);
    }
    next(error);
  }
};


const removeCollaborator = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    if (playlist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Only playlist owner can remove collaborators');
    }

    await playlist.removeCollaborator(req.params.userId);

    return ApiResponse.success(res, playlist, 'Collaborator removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  updatePlaylist,
  updatePlaylistCover,
  deletePlaylist,
  addSongToPlaylist,
  addMultipleSongsToPlaylist,
  removeSongFromPlaylist,
  removeMultipleSongsFromPlaylist,
  reorderPlaylist,
  getPublicPlaylists,
  getCuratedPlaylists,
  addCollaborator,
  removeCollaborator
};