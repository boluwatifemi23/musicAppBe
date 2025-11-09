const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  
  followType: {
    type: String,
    required: true,
    enum: ['artist', 'user', 'playlist'],
    index: true
  },
  
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'followType'
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});


followSchema.index({ followerId: 1, followType: 1, createdAt: -1 });
followSchema.index({ followingId: 1, followType: 1 });


followSchema.statics.isFollowing = async function(followerId, followType, followingId) {
  const follow = await this.findOne({ followerId, followType, followingId });
  return !!follow;
};


followSchema.statics.toggleFollow = async function(followerId, followType, followingId) {
  const existing = await this.findOne({ followerId, followType, followingId });
  
  if (existing) {
    await existing.deleteOne();
    return { following: false, message: 'Unfollowed successfully' };
  } else {
    
    await this.create({ followerId, followType, followingId });
    return { following: true, message: 'Followed successfully' };
  }
};


followSchema.statics.getFollowedArtists = function(userId, page = 1, limit = 20) {
  return this.find({ followerId: userId, followType: 'artist' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('followingId');
};


followSchema.statics.getFollowedUsers = function(userId, page = 1, limit = 20) {
  return this.find({ followerId: userId, followType: 'user' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('followingId', 'name profilePicture');
};


followSchema.statics.getFollowedPlaylists = function(userId, page = 1, limit = 20) {
  return this.find({ followerId: userId, followType: 'playlist' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('followingId');
};


followSchema.statics.getFollowers = function(followType, followingId, page = 1, limit = 20) {
  return this.find({ followType, followingId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('followerId', 'name profilePicture');
};


followSchema.statics.countFollowers = function(followType, followingId) {
  return this.countDocuments({ followType, followingId });
};


followSchema.statics.countFollowing = function(userId, followType = null) {
  const query = { followerId: userId };
  if (followType) {
    query.followType = followType;
  }
  return this.countDocuments(query);
};

const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;