// models/Queue.js - User Playback Queue Model

const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One queue per user
    // index: true
  },
  
  // Current playing song
  currentSong: {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    position: {
      type: Number, // Current position in seconds
      default: 0
    }
  },
  
  // Queue of upcoming songs
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
  
  // History (previously played in this session)
  history: [{
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    playedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Playback settings
  shuffle: {
    type: Boolean,
    default: false
  },
  repeat: {
    type: String,
    enum: ['off', 'all', 'one'],
    default: 'off'
  },
  
  // Context (what playlist/album is playing)
  context: {
    type: {
      type: String,
      enum: ['playlist', 'album', 'artist', 'queue'],
      default: 'queue'
    },
    id: mongoose.Schema.Types.ObjectId
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Instance method: Add song to queue
queueSchema.methods.addSong = async function(songId) {
  this.songs.push({ songId, addedAt: Date.now() });
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Add multiple songs
queueSchema.methods.addMultipleSongs = async function(songIds) {
  const newSongs = songIds.map(songId => ({
    songId,
    addedAt: Date.now()
  }));
  this.songs.push(...newSongs);
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Remove song from queue
queueSchema.methods.removeSong = async function(songId) {
  this.songs = this.songs.filter(s => s.songId.toString() !== songId.toString());
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Clear queue
queueSchema.methods.clearQueue = async function() {
  this.songs = [];
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Play next song
queueSchema.methods.playNext = async function() {
  if (this.currentSong.songId) {
    // Move current song to history
    this.history.unshift({
      songId: this.currentSong.songId,
      playedAt: Date.now()
    });
    
    // Keep only last 50 in history
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
  }
  
  if (this.songs.length > 0) {
    // Get next song from queue
    const nextSong = this.songs.shift();
    this.currentSong = {
      songId: nextSong.songId,
      position: 0
    };
  } else {
    // Queue is empty
    this.currentSong = { songId: null, position: 0 };
  }
  
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Play previous song
queueSchema.methods.playPrevious = async function() {
  if (this.history.length > 0) {
    // Move current song back to queue
    if (this.currentSong.songId) {
      this.songs.unshift({
        songId: this.currentSong.songId,
        addedAt: Date.now()
      });
    }
    
    // Get previous song from history
    const prevSong = this.history.shift();
    this.currentSong = {
      songId: prevSong.songId,
      position: 0
    };
    
    this.updatedAt = Date.now();
    await this.save();
  }
};

// Instance method: Update playback position
queueSchema.methods.updatePosition = async function(position) {
  this.currentSong.position = position;
  this.updatedAt = Date.now();
  await this.save({ validateBeforeSave: false });
};

// Instance method: Toggle shuffle
queueSchema.methods.toggleShuffle = async function() {
  this.shuffle = !this.shuffle;
  
  if (this.shuffle) {
    // Shuffle the queue
    this.songs = this.songs.sort(() => Math.random() - 0.5);
  }
  
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Set repeat mode
queueSchema.methods.setRepeat = async function(mode) {
  this.repeat = mode;
  this.updatedAt = Date.now();
  await this.save();
};

// Instance method: Reorder queue
queueSchema.methods.reorderQueue = async function(newOrder) {
  const reordered = newOrder.map(songId => {
    return this.songs.find(s => s.songId.toString() === songId.toString());
  }).filter(Boolean);
  
  this.songs = reordered;
  this.updatedAt = Date.now();
  await this.save();
};

// Static method: Get or create queue for user
queueSchema.statics.getOrCreateQueue = async function(userId) {
  let queue = await this.findOne({ userId });
  
  if (!queue) {
    queue = await this.create({ userId });
  }
  
  return queue;
};

const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;