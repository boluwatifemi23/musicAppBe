
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { uploadSong, uploadAlbum, uploadSingleImage } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { idValidation } = require('../middleware/validation');

router.use(protect, isAdmin);
router.get('/all', adminController.viewAllContent);
router.get('/artists/featured', adminController.getFeaturedArtistsAdmin);

router.post('/artists/featured/bulk', adminController.bulkSetFeaturedArtists);


router.put('/artists/featured/reorder', adminController.reorderFeaturedArtists);


router.post('/artists', adminController.createArtistByAdmin);


router.put('/artists/:id/featured', idValidation, adminController.toggleFeaturedArtist);


router.put('/artists/:id', idValidation, adminController.updateArtistByAdmin);


router.delete('/artists/:id', idValidation, adminController.deleteArtistByAdmin);


router.post('/songs', uploadLimiter, uploadSong, adminController.adminUploadSong);
router.post('/songs/url', adminController.addSongWithUrl);
router.post('/songs/bulk-url', adminController.bulkAddSongsWithUrl);

router.get('/songs/:id', idValidation, adminController.adminGetSong);


router.put('/songs/:id', idValidation, uploadSong, adminController.adminUpdateSong);

router.delete('/songs/:id', idValidation, adminController.adminDeleteSong);


router.post('/albums/bulk', uploadLimiter, uploadAlbum, adminController.adminUploadAlbumBulk);


router.get('/albums/:id', idValidation, adminController.adminGetAlbum);


router.put('/albums/:id', idValidation, uploadSingleImage, adminController.adminUpdateAlbum);


router.delete('/albums/:id', idValidation, adminController.adminDeleteAlbum);

module.exports = router;