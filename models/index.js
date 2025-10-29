// models/index.js - Export all models

const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Artist = require('./Artist');
const Genre = require('./Genre');
const Song = require('./Song');
const Album = require('./Album');
const Playlist = require('./Playlist');
const Like = require('./Like');
const Follow = require('./Follow');
const PlayHistory = require('./PlayHistory');
const Queue = require('./Queue');
const SearchHistory = require('./SearchHistory');

module.exports = {
  User,
  RefreshToken,
  Artist,
  Genre,
  Song,
  Album,
  Playlist,
  Like,
  Follow,
  PlayHistory,
  Queue,
  SearchHistory
};