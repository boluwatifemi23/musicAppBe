// models/SearchHistory.js - Search History Model

const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Search query cannot exceed 200 characters']
  },
  resultType: {
    type: String,
    enum: ['song', 'album', 'artist', 'playlist', 'all'],
    default: 'all'
  },
  resultCount: {
    type: Number,
    default: 0
  },
  searchedAt: {
    type: Date,
    default: Date.now,
    // index: true
  }
}, {
  timestamps: false
});

// Indexes
searchHistorySchema.index({ userId: 1, searchedAt: -1 });
searchHistorySchema.index({ query: 1 });

// TTL index - automatically delete search history older than 90 days
searchHistorySchema.index({ searchedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method: Get user's search history
searchHistorySchema.statics.getUserSearchHistory = function(userId, limit = 20) {
  return this.find({ userId })
    // .sort({ searchedAt: -1 })
    .limit(limit)
    .select('query searchedAt resultType');
};

// Static method: Get recent searches (unique queries)
searchHistorySchema.statics.getRecentSearches = async function(userId, limit = 10) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sort: { searchedAt: -1 } },
    { $group: {
        _id: '$query',
        lastSearched: { $first: '$searchedAt' },
        searchCount: { $sum: 1 }
      }
    },
    { $sort: { lastSearched: -1 } },
    { $limit: limit },
    { $project: { query: '$_id', lastSearched: 1, _id: 0 } }
  ]);
};

// Static method: Get trending searches (global)
searchHistorySchema.statics.getTrendingSearches = function(limit = 10, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);
  
  return this.aggregate([
    { $match: { searchedAt: { $gte: startDate } } },
    { $group: {
        _id: '$query',
        searchCount: { $sum: 1 }
      }
    },
    { $sort: { searchCount: -1 } },
    { $limit: limit },
    { $project: { query: '$_id', searchCount: 1, _id: 0 } }
  ]);
};

// Static method: Clear user's search history
searchHistorySchema.statics.clearUserHistory = function(userId) {
  return this.deleteMany({ userId });
};

// Static method: Delete specific search
searchHistorySchema.statics.deleteSearch = function(userId, query) {
  return this.deleteMany({ userId, query });
};

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;