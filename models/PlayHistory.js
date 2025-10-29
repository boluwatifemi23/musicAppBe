// models/PlayHistory.js - Listening History Model

const mongoose = require('mongoose');

const playHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    // index: true
  },
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true,
    index: true
  },
  
  // Playback details
  playedAt: {
    type: Date,
    default: Date.now,
    // index: true
  },
  duration: {
    type: Number, // How long user listened (in seconds)
    default: 0
  },
  completionPercentage: {
    type: Number, // Percentage of song played (0-100)
    default: 0
  },
  
  // Context (where did they play it from?)
  context: {
    type: {
      type: String,
      enum: ['playlist', 'album', 'artist', 'search', 'radio', 'recommendations'],
      default: 'search'
    },
    id: mongoose.Schema.Types.ObjectId // Playlist/Album ID if applicable
  },
  
  // Device info
  device: {
    type: String,
    default: 'web'
  }
}, {
  timestamps: false
});

// Indexes for efficient queries
// playHistorySchema.index({ userId: 1, playedAt: -1 });
// playHistorySchema.index({ songId: 1, playedAt: -1 });
playHistorySchema.index({ userId: 1, songId: 1, playedAt: -1 });

// TTL index - automatically delete history older than 90 days (optional)
playHistorySchema.index({ playedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method: Get user's listening history
playHistorySchema.statics.getUserHistory = function(userId, page = 1, limit = 50) {
  return this.find({ userId })
    .sort({ playedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'songId',
      populate: { path: 'artistId', select: 'artistName profilePicture' }
    });
};

// Static method: Get recently played (unique songs)
playHistorySchema.statics.getRecentlyPlayed = async function(userId, limit = 20) {
  const recent = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $sort: { playedAt: -1 } },
    { $group: {
        _id: '$songId',
        lastPlayed: { $first: '$playedAt' },
        playCount: { $sum: 1 }
      }
    },
    { $sort: { lastPlayed: -1 } },
    { $limit: limit }
  ]);
  
  // Populate song details
  await this.populate(recent, {
    path: '_id',
    model: 'Song',
    populate: { path: 'artistId', select: 'artistName profilePicture' }
  });
  
  return recent;
};

// Static method: Get most played songs by user
playHistorySchema.statics.getMostPlayed = function(userId, limit = 20) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: {
        _id: '$songId',
        playCount: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        lastPlayed: { $max: '$playedAt' }
      }
    },
    { $sort: { playCount: -1 } },
    { $limit: limit }
  ]);
};

// Static method: Get listening stats
playHistorySchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    { 
      $match: { 
        userId: mongoose.Types.ObjectId(userId),
        playedAt: { $gte: startDate }
      } 
    },
    { 
      $group: {
        _id: null,
        totalPlays: { $sum: 1 },
        totalMinutes: { $sum: { $divide: ['$duration', 60] } },
        uniqueSongs: { $addToSet: '$songId' }
      }
    },
    {
      $project: {
        _id: 0,
        totalPlays: 1,
        totalMinutes: { $round: ['$totalMinutes', 0] },
        uniqueSongs: { $size: '$uniqueSongs' }
      }
    }
  ]);
  
  return stats[0] || { totalPlays: 0, totalMinutes: 0, uniqueSongs: 0 };
};

// Static method: Get top artists by user
playHistorySchema.statics.getTopArtists = async function(userId, limit = 10, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { 
      $match: { 
        userId: mongoose.Types.ObjectId(userId),
        playedAt: { $gte: startDate }
      } 
    },
    {
      $lookup: {
        from: 'songs',
        localField: 'songId',
        foreignField: '_id',
        as: 'song'
      }
    },
    { $unwind: '$song' },
    {
      $group: {
        _id: '$song.artistId',
        playCount: { $sum: 1 }
      }
    },
    { $sort: { playCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'artists',
        localField: '_id',
        foreignField: '_id',
        as: 'artist'
      }
    },
    { $unwind: '$artist' }
  ]);
};

const PlayHistory = mongoose.model('PlayHistory', playHistorySchema);

module.exports = PlayHistory;