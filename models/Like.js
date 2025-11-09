const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
   
  },
  
  
  itemType: {
    type: String,
    required: true,
    enum: ['song', 'album', 'playlist'],
  },
  
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType' 
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false 
});


likeSchema.index({ userId: 1, itemType: 1, itemId: 1 })
likeSchema.index({  createdAt: -1 });

likeSchema.pre('save', function(next) {
  if (this.itemType) {
    this.itemType = this.itemType.toLowerCase();
  }
  next();
});


likeSchema.statics.isLiked = async function(userId, itemType, itemId) {
  const like = await this.findOne({ userId, itemType, itemId });
  return !!like;
};


likeSchema.statics.toggleLike = async function(userId, itemType, itemId) {
  const existing = await this.findOne({ userId, itemType, itemId });
  
  if (existing) {
    
    await existing.deleteOne();
    return { liked: false, message: 'Unliked successfully' };
  } else {
    
    await this.create({ userId, itemType, itemId });
    return { liked: true, message: 'Liked successfully' };
  }
};


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


likeSchema.statics.countLikes = function(itemType, itemId) {
  return this.countDocuments({ itemType, itemId });
};


likeSchema.statics.getItemLikers = function(itemType, itemId, limit = 20) {
  return this.find({ itemType, itemId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name profilePicture');
};

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;