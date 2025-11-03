// routes/playlistRoutes.js - Playlist Routes

const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');
const { playlistValidation, idValidation } = require('../middleware/validation');

// Public routes
router.get('/public', playlistController.getPublicPlaylists);
router.get('/curated', playlistController.getCuratedPlaylists);
router.get('/', optionalAuth, idValidation, playlistController.getPlaylist);

// Protected routes
router.post('/', protect, playlistValidation.create, playlistController.createPlaylist);
router.get('/:id', protect, playlistController.getUserPlaylists);
router.put('/:id', protect, idValidation, playlistValidation.update, playlistController.updatePlaylist);
router.put('/:id/cover', protect, idValidation, uploadSingleImage, playlistController.updatePlaylistCover);
router.delete('/:id', protect, idValidation, playlistController.deletePlaylist);

// Playlist songs management
router.post('/:id/songs', protect, idValidation, playlistController.addSongToPlaylist);
router.delete('/:id/songs/:songId', protect, playlistController.removeSongFromPlaylist);
router.put('/:id/reorder', protect, idValidation, playlistController.reorderPlaylist);

// Collaborators
router.post('/:id/collaborators', protect, idValidation, playlistController.addCollaborator);
router.delete('/:id/collaborators/:userId', protect, playlistController.removeCollaborator);

module.exports = router;