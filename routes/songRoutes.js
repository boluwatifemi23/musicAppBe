

const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { isArtist } = require('../middleware/roleMiddleware');
const { uploadSong } = require('../middleware/uploadMiddleware');
const { songValidation, idValidation, paginationValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');


router.get('/', paginationValidation, songController.getSongs);
router.get('/trending', songController.getTrendingSongs);
router.get('/popular', songController.getPopularSongs);
router.get('/new-releases', songController.getNewReleases);
router.get('/genre/:genre', songController.getSongsByGenre);
router.get('/stream/:id', songController.streamSong);
router.get('/:id', optionalAuth, idValidation, songController.getSong);


router.post('/', protect, isArtist, uploadLimiter, uploadSong, songValidation.create, songController.createSong);
router.post('/:id/play', optionalAuth, idValidation, songController.trackPlay);
router.get('/recommendations', protect, songController.getRecommendations);
router.put('/:id', protect, isArtist, idValidation, songController.updateSong);
router.delete('/:id', protect, isArtist, idValidation, songController.deleteSong);

module.exports = router;