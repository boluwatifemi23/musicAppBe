const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');
const { idValidation, paginationValidation } = require('../middleware/validation');

router.post('/artist/:id', protect, idValidation, followController.toggleFollowArtist);
router.post('/user/:id', protect, idValidation, followController.toggleFollowUser);

router.get('/artists', protect, paginationValidation, followController.getFollowedArtists);
router.get('/users', protect, paginationValidation, followController.getFollowedUsers);
router.get('/followers', protect, paginationValidation, followController.getFollowers);


router.get('/artist/:id/followers', paginationValidation, followController.getArtistFollowers);

router.post('/check', protect, followController.checkFollowing);

module.exports = router;