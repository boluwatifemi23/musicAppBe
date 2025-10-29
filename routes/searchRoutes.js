// routes/searchRoutes.js - Search Routes

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimiter');

// Public routes (with rate limiting)
router.get('/', searchLimiter, optionalAuth, searchController.searchAll);
router.get('/songs', searchLimiter, optionalAuth, searchController.searchSongs);
router.get('/albums', searchLimiter, optionalAuth, searchController.searchAlbums);
router.get('/artists', searchLimiter, optionalAuth, searchController.searchArtists);
router.get('/playlists', searchLimiter, optionalAuth, searchController.searchPlaylists);
router.get('/trending', searchController.getTrendingSearches);

// Protected routes
router.get('/history', protect, searchController.getSearchHistory);
router.delete('/history', protect, searchController.clearSearchHistory);

module.exports = router;