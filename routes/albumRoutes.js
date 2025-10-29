// routes/albumRoutes.js - Album Routes (Standalone)

const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const { protect } = require('../middleware/authMiddleware');
const { isArtist } = require('../middleware/roleMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');
const { idValidation, paginationValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', paginationValidation, albumController.getAlbums);
router.get('/new-releases', albumController.getNewReleases);
router.get('/popular', albumController.getPopularAlbums);
router.get('/:id', idValidation, albumController.getAlbum);

// Protected routes (Artist only)
router.post('/', protect, isArtist, uploadLimiter, uploadSingleImage, albumController.createAlbum);
router.put('/:id', protect, isArtist, idValidation, uploadSingleImage, albumController.updateAlbum);
router.delete('/:id', protect, isArtist, idValidation, albumController.deleteAlbum);

module.exports = router;