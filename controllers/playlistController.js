// controllers/playlistController.js - Playlist Management Controller

const { Playlist, Song, Like } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { uploadImage, deleteFile } = require('../utils/cloudinaryUpload');

// @desc    Create playlist
// @route   POST /api/playlists
// @access  Private
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

    // Update user stats
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

// @desc    Get user's playlists
// @route   GET /api/playlists
// @access  Private
const getUserPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.findUserPlaylists(req.user._id);

    return ApiResponse.success(
      res,
      playlists,
      'Playlists retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get single playlist
// @route   GET /api/playlists/:id
// @access  Public
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

    // Check if playlist is private and user is not the owner
    if (!playlist.isPublic && 
        (!req.user || req.user._id.toString() !== playlist.userId._id.toString())) {
      return ApiResponse.forbidden(res, 'This playlist is private');
    }

    // Check if user is following this playlist
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

// @desc    Update playlist
// @route   PUT /api/playlists/:id
// @access  Private
const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Check if user can edit
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

// @desc    Update playlist cover
// @route   PUT /api/playlists/:id/cover
// @access  Private
const updatePlaylistCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an image', 400);
    }

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Check if user can edit
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    // Delete old cover
    if (playlist.coverImage.publicId) {
      await deleteFile(playlist.coverImage.publicId, 'image');
    }

    // Upload new cover
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

// @desc    Delete playlist
// @route   DELETE /api/playlists/:id
// @access  Private
const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Only owner can delete
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this playlist');
    }

    // Delete cover image if exists
    if (playlist.coverImage.publicId) {
      await deleteFile(playlist.coverImage.publicId, 'image');
    }

    await playlist.deleteOne();

    // Update user stats
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

// @desc    Add song to playlist
// @route   POST /api/playlists/:id/songs
// @access  Private
const addSongToPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Check if user can edit
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return ApiResponse.notFound(res, 'Song not found');
    }

    // Add song
    await playlist.addSong(songId);

    return ApiResponse.success(res, playlist, 'Song added to playlist');
  } catch (error) {
    if (error.message === 'Song already in playlist') {
      return ApiResponse.error(res, error.message, 400);
    }
    next(error);
  }
};

// @desc    Remove song from playlist
// @route   DELETE /api/playlists/:id/songs/:songId
// @access  Private
const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Check if user can edit
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    await playlist.removeSong(req.params.songId);

    return ApiResponse.success(res, playlist, 'Song removed from playlist');
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder songs in playlist
// @route   PUT /api/playlists/:id/reorder
// @access  Private
const reorderPlaylist = async (req, res, next) => {
  try {
    const { songOrder } = req.body; // Array of song IDs in new order

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Check if user can edit
    if (!playlist.canEdit(req.user._id)) {
      return ApiResponse.forbidden(res, 'Not authorized to edit this playlist');
    }

    await playlist.reorderSongs(songOrder);

    return ApiResponse.success(res, playlist, 'Playlist reordered successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get public playlists
// @route   GET /api/playlists/public
// @access  Public
const getPublicPlaylists = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const playlists = await Playlist.findPublicPlaylists(limit);

    return ApiResponse.success(res, playlists, 'Public playlists retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Get system/curated playlists
// @route   GET /api/playlists/curated
// @access  Public
const getCuratedPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.findSystemPlaylists();

    return ApiResponse.success(res, playlists, 'Curated playlists retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Add collaborator to playlist
// @route   POST /api/playlists/:id/collaborators
// @access  Private
const addCollaborator = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Only owner can add collaborators
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

// @desc    Remove collaborator from playlist
// @route   DELETE /api/playlists/:id/collaborators/:userId
// @access  Private
const removeCollaborator = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, 'Playlist not found');
    }

    // Only owner can remove collaborators
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
  removeSongFromPlaylist,
  reorderPlaylist,
  getPublicPlaylists,
  getCuratedPlaylists,
  addCollaborator,
  removeCollaborator
};