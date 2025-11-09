const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  coverImage: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/playlist-placeholder.png'
    },
    publicId: String
  },
  
  
  songs: [{
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  
  isPublic: {
    type: Boolean,
    default: true
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  
 
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  
  stats: {
    totalSongs: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number, 
      default: 0
    },
    plays: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    }
  },
  

  tags: [{
    type: String,
    trim: true
  }],
  
 
  isSystemPlaylist: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


playlistSchema.index({  description: 'text' });
playlistSchema.index({ userId: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ 'stats.followers': -1 });
playlistSchema.index({ isSystemPlaylist: 1 });


playlistSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.stats.totalDuration / 3600);
  const minutes = Math.floor((this.stats.totalDuration % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
});


playlistSchema.virtual('playlistUrl').get(function() {
  return `${process.env.CLIENT_URL}/playlist/${this._id}`;
});


playlistSchema.methods.addSong = async function(songId) {

  const exists = this.songs.some(s => s.songId.toString() === songId.toString());
  
  if (exists) {
    throw new Error('Song already in playlist');
  }
  
  this.songs.push({ songId, addedAt: Date.now() });
  await this.save();
  await this.updateStats();
};


playlistSchema.methods.removeSong = async function(songId) {
  this.songs = this.songs.filter(s => s.songId.toString() !== songId.toString());
  await this.save();
  await this.updateStats();
};


playlistSchema.methods.reorderSongs = async function(newOrder) {

  const reordered = newOrder.map(songId => {
    return this.songs.find(s => s.songId.toString() === songId.toString());
  }).filter(Boolean);
  
  this.songs = reordered;
  await this.save();
};


playlistSchema.methods.updateStats = async function() {
  const Song = mongoose.model('Song');
  const songIds = this.songs.map(s => s.songId);
  const songs = await Song.find({ _id: { $in: songIds } });
  
  this.stats.totalSongs = songs.length;
  this.stats.totalDuration = songs.reduce((sum, song) => sum + song.audioFile.duration, 0);
  
  await this.save({ validateBeforeSave: false });
};


playlistSchema.methods.canEdit = function(userId) {
  return (
    this.userId.toString() === userId.toString() ||
    this.collaborators.some(c => c.toString() === userId.toString())
  );
};


playlistSchema.methods.addCollaborator = async function(userId) {
  if (!this.isCollaborative) {
    throw new Error('Playlist is not collaborative');
  }
  
  if (!this.collaborators.includes(userId)) {
    this.collaborators.push(userId);
    await this.save();
  }
};


playlistSchema.methods.removeCollaborator = async function(userId) {
  this.collaborators = this.collaborators.filter(c => c.toString() !== userId.toString());
  await this.save();
};


playlistSchema.statics.findUserPlaylists = function(userId) {
  return this.find({ 
    userId, 
    isActive: true 
  })
  .sort({ updatedAt: -1 });
};


playlistSchema.statics.findPublicPlaylists = function(limit = 20) {
  return this.find({ 
    isPublic: true, 
    isActive: true 
  })
  .sort({ 'stats.followers': -1 })
  .limit(limit)
  .populate('userId', 'name profilePicture');
};


playlistSchema.statics.findSystemPlaylists = function() {
  return this.find({ 
    isSystemPlaylist: true, 
    isActive: true 
  })
  .sort({ createdAt: -1 });
};


playlistSchema.statics.searchPlaylists = function(query, limit = 20) {
  return this.find({
    $text: { $search: query },
    isPublic: true,
    isActive: true
  })
  .sort({ score: { $meta: 'textScore' }, 'stats.followers': -1 })
  .limit(limit)
  .populate('userId', 'name profilePicture');
};

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;