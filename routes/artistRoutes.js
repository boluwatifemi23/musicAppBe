// routes/artistRoutes.js - Artist Routes (Standalone)

const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
const { protect } = require('../middleware/authMiddleware');
const { isArtist } = require('../middleware/roleMiddleware');
const { uploadSingleImage, uploadSong, uploadAlbum } = require('../middleware/uploadMiddleware');
const { idValidation, paginationValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/featured', artistController.getFeaturedArtists);
router.get('/popular', artistController.getPopularArtists);
router.get('/:id', idValidation, artistController.getArtist);
router.get('/:id/songs', idValidation, paginationValidation, artistController.getArtistSongs);
router.get('/:id/albums', idValidation, paginationValidation, artistController.getArtistAlbums);

// Protected routes (Artist profile management)
router.post('/', protect, artistController.createArtist);
router.put('/:id', protect, isArtist, idValidation, artistController.updateArtist);
router.put('/:id/profile-picture', protect, isArtist, idValidation, uploadSingleImage, artistController.updateArtistProfilePicture);
router.put('/:id/cover-image', protect, isArtist, idValidation, uploadSingleImage, artistController.updateArtistCoverImage);


router.post('/me/songs', protect, isArtist, uploadLimiter, uploadSong, artistController.artistUploadSong);
router.post('/me/albums', protect, isArtist, uploadLimiter, uploadAlbum, artistController.artistUploadAlbum);

module.exports = router;
