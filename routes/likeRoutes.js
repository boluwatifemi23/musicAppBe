const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const { protect } = require('../middleware/authMiddleware');
const { idValidation, paginationValidation } = require('../middleware/validation');


router.post('/song/:id', protect, idValidation, likeController.toggleLikeSong);
router.post('/album/:id', protect, idValidation, likeController.toggleLikeAlbum);
router.post('/playlist/:id', protect, idValidation, likeController.toggleLikePlaylist);

router.get('/songs', protect, paginationValidation, likeController.getLikedSongs);
router.get('/albums', protect, paginationValidation, likeController.getLikedAlbums);
router.get('/playlists', protect, paginationValidation, likeController.getLikedPlaylists);

router.post('/check', protect, likeController.checkLikes);

module.exports = router;