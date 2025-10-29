// models/Album.js - Album Model

const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Album title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  // Artist reference
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
    index: true
  },
  
  // Cover image
  coverImage: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/album-placeholder.png'
    },
    publicId: String
  },
  
  // Metadata
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  genre: {
    type: String,
    trim: true,
    // index: true
  },
  releaseDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  recordLabel: {
    type: String,
    trim: true
  },
  
  // Album type
  type: {
    type: String,
    enum: ['album', 'ep', 'single', 'compilation'],
    default: 'album'
  },
  
  // Tracklist (references to songs)
  // Note: Songs also have albumId, this is for ordered tracklist
  tracks: [{
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    trackNumber: Number
  }],
  
  // Statistics
  stats: {
    totalTracks: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number, // Total duration in seconds
      default: 0
    },
    plays: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    }
  },
  
  // Availability
  isPublished: {
    type: Boolean,
    default: true
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

// Indexes
albumSchema.index({ title: 'text' });
albumSchema.index({ artistId: 1, releaseDate: -1 });
albumSchema.index({ genre: 1 });
albumSchema.index({ releaseDate: -1 });
albumSchema.index({ 'stats.plays': -1 });

// Virtual: All songs in album
albumSchema.virtual('songs', {
  ref: 'Song',
  localField: '_id',
  foreignField: 'albumId'
});

// Virtual: Formatted total duration
albumSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.stats.totalDuration / 3600);
  const minutes = Math.floor((this.stats.totalDuration % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
});

// Virtual: Album URL
albumSchema.virtual('albumUrl').get(function() {
  return `${process.env.CLIENT_URL}/album/${this._id}`;
});

// Instance method: Update stats
albumSchema.methods.updateStats = async function() {
  const Song = mongoose.model('Song');
  const songs = await Song.find({ albumId: this._id });
  
  this.stats.totalTracks = songs.length;
  this.stats.totalDuration = songs.reduce((sum, song) => sum + song.audioFile.duration, 0);
  this.stats.plays = songs.reduce((sum, song) => sum + song.stats.plays, 0);
  
  await this.save({ validateBeforeSave: false });
};

// Instance method: Add track
albumSchema.methods.addTrack = async function(songId, trackNumber) {
  this.tracks.push({ songId, trackNumber });
  await this.save();
  await this.updateStats();
};

// Instance method: Remove track
albumSchema.methods.removeTrack = async function(songId) {
  this.tracks = this.tracks.filter(track => track.songId.toString() !== songId.toString());
  await this.save();
  await this.updateStats();
};

// Static method: Find new releases
albumSchema.statics.findNewReleases = function(limit = 20) {
  return this.find({ isPublished: true, isActive: true })
    .sort({ releaseDate: -1 })
    .limit(limit)
    .populate('artistId', 'artistName profilePicture');
};

// Static method: Find popular albums
albumSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isPublished: true, isActive: true })
    .sort({ 'stats.plays': -1 })
    .limit(limit)
    .populate('artistId', 'artistName profilePicture');
};

// Static method: Find by genre
albumSchema.statics.findByGenre = function(genre, limit = 20) {
  return this.find({ 
    genre, 
    isPublished: true, 
    isActive: true 
  })
  .sort({ 'stats.plays': -1 })
  .limit(limit)
  .populate('artistId', 'artistName profilePicture');
};

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;