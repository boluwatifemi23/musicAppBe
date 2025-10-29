// models/Song.js - Song Model

const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
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
  
  // Album reference (optional - singles don't have albums)
  albumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    index: true
  },
  
  // Audio file
  audioFile: {
    url: {
      type: String,
      required: [true, 'Audio URL is required']
    },
    publicId: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // Duration in seconds
      required: true
    },
    format: {
      type: String,
      default: 'mp3'
    },
    size: Number // File size in bytes
  },
  
  // Cover image
  coverImage: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/song-placeholder.png'
    },
    publicId: String
  },
  
  // Metadata
  genre: {
    type: String,
    trim: true,
    index: true
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  lyrics: {
    type: String,
    maxlength: [10000, 'Lyrics cannot exceed 10000 characters']
  },
  language: {
    type: String,
    default: 'English'
  },
  
  // Featuring artists
  featuring: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist'
  }],
  
  // Statistics
  stats: {
    plays: {
      type: Number,
      default: 0,
      index: true
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    }
  },
  
  // Trending
  isTrending: {
    type: Boolean,
    default: false
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  
  // Explicit content
  isExplicit: {
    type: Boolean,
    default: false
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

// Indexes for performance
songSchema.index({ title: 'text' }); // Text search
songSchema.index({ artistId: 1, createdAt: -1 });
// songSchema.index({ albumId: 1 });
// songSchema.index({ genre: 1 });
songSchema.index({ 'stats.plays': -1 }); // Popular songs
songSchema.index({ isTrending: 1, trendingScore: -1 });
songSchema.index({ releaseDate: -1 }); // New releases
songSchema.index({ isPublished: 1, isActive: 1 });

// Virtual: Formatted duration (MM:SS)
songSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.audioFile.duration / 60);
  const seconds = Math.floor(this.audioFile.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual: Song URL
songSchema.virtual('songUrl').get(function() {
  return `${process.env.CLIENT_URL}/song/${this._id}`;
});

// Instance method: Increment play count
songSchema.methods.incrementPlayCount = async function() {
  this.stats.plays += 1;
  
  // Update trending score (recent plays count more)
  const daysSinceRelease = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  this.trendingScore = this.stats.plays / Math.max(daysSinceRelease, 1);
  
  await this.save({ validateBeforeSave: false });
};

// Instance method: Increment like count
songSchema.methods.incrementLikeCount = async function() {
  this.stats.likes += 1;
  await this.save({ validateBeforeSave: false });
};

// Instance method: Decrement like count
songSchema.methods.decrementLikeCount = async function() {
  this.stats.likes = Math.max(0, this.stats.likes - 1);
  await this.save({ validateBeforeSave: false });
};

// Static method: Find trending songs
songSchema.statics.findTrending = function(limit = 20) {
  return this.find({ isPublished: true, isActive: true })
    .sort({ trendingScore: -1, 'stats.plays': -1 })
    .limit(limit)
    .populate('artistId', 'artistName profilePicture')
    .populate('albumId', 'title coverImage');
};

// Static method: Find popular songs
songSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isPublished: true, isActive: true })
    .sort({ 'stats.plays': -1 })
    .limit(limit)
    .populate('artistId', 'artistName profilePicture')
    .populate('albumId', 'title coverImage');
};

// Static method: Find new releases
songSchema.statics.findNewReleases = function(limit = 20) {
  return this.find({ isPublished: true, isActive: true })
    .sort({ releaseDate: -1 })
    .limit(limit)
    .populate('artistId', 'artistName profilePicture')
    .populate('albumId', 'title coverImage');
};

// Static method: Find songs by genre
songSchema.statics.findByGenre = function(genre, limit = 20) {
  return this.find({ 
    genre, 
    isPublished: true, 
    isActive: true 
  })
  .sort({ 'stats.plays': -1 })
  .limit(limit)
  .populate('artistId', 'artistName profilePicture');
};

// Static method: Search songs
songSchema.statics.searchSongs = function(query, limit = 20) {
  return this.find({
    $text: { $search: query },
    isPublished: true,
    isActive: true
  })
  .sort({ score: { $meta: 'textScore' }, 'stats.plays': -1 })
  .limit(limit)
  .populate('artistId', 'artistName profilePicture')
  .populate('albumId', 'title coverImage');
};

const Song = mongoose.model('Song', songSchema);

module.exports = Song;