const mongoose = require('mongoose');

const playHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true,
    index: true
  },
  playedAt: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0
  },
  context: {
    type: {
      type: String,
      enum: ['playlist', 'album', 'artist', 'search', 'radio', 'recommendations'],
      default: 'search'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  device: {
    type: String,
    default: 'web'
  }
});

playHistorySchema.index({ userId: 1, songId: 1, playedAt: -1 });
playHistorySchema.index({ playedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

playHistorySchema.statics.getUserHistory = function (userId, page = 1, limit = 50) {
  return this.find({ userId })
    .sort({ playedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'songId',
      populate: { path: 'artistId', select: 'artistName profilePicture' }
    });
};

playHistorySchema.statics.getRecentlyPlayed = async function (userId, limit = 20) {
  const recent = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $sort: { playedAt: -1 } },
    {
      $group: {
        _id: '$songId',
        lastPlayed: { $first: '$playedAt' },
        playCount: { $sum: 1 }
      }
    },
    { $sort: { lastPlayed: -1 } },
    { $limit: limit }
  ]);

  await this.populate(recent, {
    path: '_id',
    model: 'Song',
    populate: { path: 'artistId', select: 'artistName profilePicture' }
  });

  return recent;
};

playHistorySchema.statics.getMostPlayed = function (userId, limit = 20) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
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

playHistorySchema.statics.getUserStats = async function (userId, days = 30) {
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

playHistorySchema.statics.getTopArtists = async function (userId, limit = 10, days = 30) {
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
