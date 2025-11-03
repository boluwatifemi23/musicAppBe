// controllers/index.js - Export all controllers

const authController = require('./authController');
const userController = require('./userController');
const artistController = require('./artistController');
const songController = require('./songController');
const albumController = require('./albumController');
const playlistController = require('./playlistController');
const searchController = require('./searchController');
const likeController = require('./likeController');
const followController = require('./followController');
const uploadController = require('./uploadController');
const adminController = require('./adminController')

module.exports = {
  authController,
  userController,
  artistController,
  songController,
  albumController,
  playlistController,
  searchController,
  likeController,
  followController,
  uploadController,
  adminController
};