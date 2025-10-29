// routes/index.js - Export all routes

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const musicRoutes = require('./musicRoutes'); // Combined songs, albums, artists
const artistRoutes = require('./artistRoutes'); // Standalone artist routes
const songRoutes = require('./songRoutes'); // Standalone song routes
const albumRoutes = require('./albumRoutes'); // Standalone album routes
const playlistRoutes = require('./playlistRoutes');
const searchRoutes = require('./searchRoutes');
const likeRoutes = require('./likeRoutes');
const followRoutes = require('./followRoutes');
const uploadRoutes = require('./uploadRoutes');

module.exports = {
  authRoutes,
  userRoutes,
  musicRoutes,
  artistRoutes,
  songRoutes,
  albumRoutes,
  playlistRoutes,
  searchRoutes,
  likeRoutes,
  followRoutes,
  uploadRoutes
};