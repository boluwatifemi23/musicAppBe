
const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const albumController = require('../controllers/albumController');
const artistController = require('../controllers/artistController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { isArtist } = require('../middleware/roleMiddleware');
const { uploadSong, uploadSingleImage } = require('../middleware/uploadMiddleware');
const { songValidation, idValidation, paginationValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');


router.get('/songs', paginationValidation, songController.getSongs);
router.get('/songs/trending', songController.getTrendingSongs);
router.get('/songs/popular', songController.getPopularSongs);
router.get('/songs/new-releases', songController.getNewReleases);
router.get('/songs/genre/:genre', songController.getSongsByGenre);
router.get('/songs/stream/:id', songController.streamSong);
router.get('/songs/:id', optionalAuth, idValidation, songController.getSong);


router.post('/songs', protect, isArtist, uploadLimiter, uploadSong, songValidation.create, songController.createSong);
router.post('/songs/:id/play', optionalAuth, idValidation, songController.trackPlay);
router.get('/songs/recommendations', protect, songController.getRecommendations);
router.put('/songs/:id', protect, isArtist, idValidation, songController.updateSong);
router.delete('/songs/:id', protect, isArtist, idValidation, songController.deleteSong);


router.get('/albums', paginationValidation, albumController.getAlbums);
router.get('/albums/new-releases', albumController.getNewReleases);
router.get('/albums/popular', albumController.getPopularAlbums);
router.get('/albums/:id', idValidation, albumController.getAlbum);


router.post('/albums', protect, isArtist, uploadLimiter, uploadSingleImage, albumController.createAlbum);
router.put('/albums/:id', protect, isArtist, idValidation, uploadSingleImage, albumController.updateAlbum);
router.delete('/albums/:id', protect, isArtist, idValidation, albumController.deleteAlbum);


router.get('/artists/featured', artistController.getFeaturedArtists);
router.get('/artists/popular', artistController.getPopularArtists);
router.get('/artists/:id', idValidation, artistController.getArtist);
router.get('/artists/:id/songs', idValidation, paginationValidation, artistController.getArtistSongs);
router.get('/artists/:id/albums', idValidation, paginationValidation, artistController.getArtistAlbums);

router.post('/artists', protect, artistController.createArtist);
router.put('/artists/:id', protect, isArtist, idValidation, artistController.updateArtist);
router.put('/artists/:id/profile-picture', protect, isArtist, idValidation, uploadSingleImage, artistController.updateArtistProfilePicture);
router.put('/artists/:id/cover-image', protect, isArtist, idValidation, uploadSingleImage, artistController.updateArtistCoverImage);

module.exports = router;