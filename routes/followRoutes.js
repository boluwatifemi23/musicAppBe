// routes/followRoutes.js - Follow/Unfollow Routes

const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');
const { idValidation, paginationValidation } = require('../middleware/validation');

// All routes are protected (must be logged in to follow)
router.post('/artist/:id', protect, idValidation, followController.toggleFollowArtist);
router.post('/user/:id', protect, idValidation, followController.toggleFollowUser);

router.get('/artists', protect, paginationValidation, followController.getFollowedArtists);
router.get('/users', protect, paginationValidation, followController.getFollowedUsers);
router.get('/followers', protect, paginationValidation, followController.getFollowers);

// Public route to see artist followers
router.get('/artist/:id/followers', paginationValidation, followController.getArtistFollowers);

router.post('/check', protect, followController.checkFollowing);

module.exports = router;