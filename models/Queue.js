

const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, 
  },
  
  
  currentSong: {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    position: {
      type: Number, 
      default: 0
    }
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
  
  
  shuffle: {
    type: Boolean,
    default: false
  },
  repeat: {
    type: String,
    enum: ['off', 'all', 'one'],
    default: 'off'
  },
  
  
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


queueSchema.methods.addSong = async function(songId) {
  this.songs.push({ songId, addedAt: Date.now() });
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.addMultipleSongs = async function(songIds) {
  const newSongs = songIds.map(songId => ({
    songId,
    addedAt: Date.now()
  }));
  this.songs.push(...newSongs);
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.removeSong = async function(songId) {
  this.songs = this.songs.filter(s => s.songId.toString() !== songId.toString());
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.clearQueue = async function() {
  this.songs = [];
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.playNext = async function() {
  if (this.currentSong.songId) {
    
    this.history.unshift({
      songId: this.currentSong.songId,
      playedAt: Date.now()
    });
    
   
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
  }
  
  if (this.songs.length > 0) {
  
    const nextSong = this.songs.shift();
    this.currentSong = {
      songId: nextSong.songId,
      position: 0
    };
  } else {
  
    this.currentSong = { songId: null, position: 0 };
  }
  
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.playPrevious = async function() {
  if (this.history.length > 0) {
  
    if (this.currentSong.songId) {
      this.songs.unshift({
        songId: this.currentSong.songId,
        addedAt: Date.now()
      });
    }

    const prevSong = this.history.shift();
    this.currentSong = {
      songId: prevSong.songId,
      position: 0
    };
    
    this.updatedAt = Date.now();
    await this.save();
  }
};


queueSchema.methods.updatePosition = async function(position) {
  this.currentSong.position = position;
  this.updatedAt = Date.now();
  await this.save({ validateBeforeSave: false });
};


queueSchema.methods.toggleShuffle = async function() {
  this.shuffle = !this.shuffle;
  
  if (this.shuffle) {
   
    this.songs = this.songs.sort(() => Math.random() - 0.5);
  }
  
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.setRepeat = async function(mode) {
  this.repeat = mode;
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.methods.reorderQueue = async function(newOrder) {
  const reordered = newOrder.map(songId => {
    return this.songs.find(s => s.songId.toString() === songId.toString());
  }).filter(Boolean);
  
  this.songs = reordered;
  this.updatedAt = Date.now();
  await this.save();
};


queueSchema.statics.getOrCreateQueue = async function(userId) {
  let queue = await this.findOne({ userId });
  
  if (!queue) {
    queue = await this.create({ userId });
  }
  
  return queue;
};

const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;