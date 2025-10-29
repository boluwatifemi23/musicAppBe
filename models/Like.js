// models/Like.js - Like/Save Model

const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    // index: true
  },
  
  // What is being liked (only one of these will be populated)
  itemType: {
    type: String,
    required: true,
    enum: ['song', 'album', 'playlist'],
    // index: true
  },
  
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType' // Dynamic reference based on itemType
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Only need createdAt
});

// Compound indexes for efficient queries
likeSchema.index({ userId: 1, itemType: 1, itemId: 1 })// Prevent duplicate likes
likeSchema.index({  createdAt: -1 });
// likeSchema.index({ itemId: 1, itemType: 1 });

// Capitalize itemType before saving (for refPath)
likeSchema.pre('save', function(next) {
  if (this.itemType) {
    this.itemType = this.itemType.toLowerCase();
  }
  next();
});

// Static method: Check if user liked an item
likeSchema.statics.isLiked = async function(userId, itemType, itemId) {
  const like = await this.findOne({ userId, itemType, itemId });
  return !!like;
};

// Static method: Toggle like (like if not liked, unlike if liked)
likeSchema.statics.toggleLike = async function(userId, itemType, itemId) {
  const existing = await this.findOne({ userId, itemType, itemId });
  
  if (existing) {
    // Unlike
    await existing.deleteOne();
    return { liked: false, message: 'Unliked successfully' };
  } else {
    // Like
    await this.create({ userId, itemType, itemId });
    return { liked: true, message: 'Liked successfully' };
  }
};

// Static method: Get user's liked songs
likeSchema.statics.getUserLikedSongs = function(userId, page = 1, limit = 20) {
  return this.find({ userId, itemType: 'song' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'itemId',
      populate: { path: 'artistId', select: 'artistName profilePicture' }
    });
};

// Static method: Get user's liked albums
likeSchema.statics.getUserLikedAlbums = function(userId, page = 1, limit = 20) {
  return this.find({ userId, itemType: 'album' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'itemId',
      populate: { path: 'artistId', select: 'artistName profilePicture' }
    });
};

// Static method: Get user's liked playlists
likeSchema.statics.getUserLikedPlaylists = function(userId, page = 1, limit = 20) {
  return this.find({ userId, itemType: 'playlist' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'itemId',
      populate: { path: 'userId', select: 'name profilePicture' }
    });
};

// Static method: Count item likes
likeSchema.statics.countLikes = function(itemType, itemId) {
  return this.countDocuments({ itemType, itemId });
};

// Static method: Get users who liked an item
likeSchema.statics.getItemLikers = function(itemType, itemId, limit = 20) {
  return this.find({ itemType, itemId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name profilePicture');
};

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;