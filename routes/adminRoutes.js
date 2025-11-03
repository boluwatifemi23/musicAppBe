// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { uploadSong, uploadAlbum, uploadSingleImage } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// All routes protected and admin-only
router.use(protect, isAdmin);

// Single song upload (audio + optional cover)
router.post('/songs', uploadLimiter, uploadSong, adminController.adminUploadSong);

// Bulk album upload (cover + multiple songs)
router.post('/albums/bulk', uploadLimiter, uploadAlbum, adminController.adminUploadAlbumBulk);

// Artists CRUD
router.post('/artists', adminController.createArtistByAdmin);
router.put('/artists/:id', adminController.updateArtistByAdmin);
router.delete('/artists/:id', adminController.deleteArtistByAdmin);

// Songs CRUD
router.get('/songs/:id', adminController.adminGetSong);
router.put('/songs/:id', uploadSong, adminController.adminUpdateSong);
router.delete('/songs/:id', adminController.adminDeleteSong);

// Albums CRUD
router.get('/albums/:id', adminController.adminGetAlbum);
router.put('/albums/:id', uploadSingleImage, adminController.adminUpdateAlbum);
router.delete('/albums/:id', adminController.adminDeleteAlbum);

// View everything
router.get('/all', adminController.viewAllContent);

module.exports = router;
