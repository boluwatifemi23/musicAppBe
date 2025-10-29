// models/Artist.js - Artist Model

const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  // Link to User account
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    // index: true
  },
  
  // Artist Profile
  artistName: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true,
    minlength: [2, 'Artist name must be at least 2 characters'],
    maxlength: [50, 'Artist name cannot exceed 50 characters']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    default: ''
  },
  profilePicture: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/artist-placeholder.png'
    },
    publicId: String
  },
  coverImage: {
    url: String,
    publicId: String
  },
  
  // Genres
  genres: [{
    type: String,
    trim: true
  }],
  
  // Social Links
  socialLinks: {
    instagram: String,
    twitter: String,
    facebook: String,
    youtube: String,
    spotify: String,
    website: String
  },
  
  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  
  // Statistics
  stats: {
    totalSongs: {
      type: Number,
      default: 0
    },
    totalAlbums: {
      type: Number,
      default: 0
    },
    totalPlays: {
      type: Number,
      default: 0
    },
    totalFollowers: {
      type: Number,
      default: 0
    },
    monthlyListeners: {
      type: Number,
      default: 0
    }
  },
  
  // Featured
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredAt: Date,
  
  // Status
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
artistSchema.index({ artistName: 1 });
artistSchema.index({ userId: 1 });
artistSchema.index({ isVerified: 1 });
artistSchema.index({ 'stats.totalFollowers': -1 }); // For popular artists
artistSchema.index({ createdAt: -1 });

// Virtual: Get all songs by this artist
artistSchema.virtual('songs', {
  ref: 'Song',
  localField: '_id',
  foreignField: 'artistId'
});

// Virtual: Get all albums by this artist
artistSchema.virtual('albums', {
  ref: 'Album',
  localField: '_id',
  foreignField: 'artistId'
});

// Virtual: Artist profile URL
artistSchema.virtual('profileUrl').get(function() {
  return `${process.env.CLIENT_URL}/artist/${this._id}`;
});

// Instance method: Verify artist
artistSchema.methods.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = Date.now();
  await this.save();
};

// Instance method: Update statistics
artistSchema.methods.updateStats = async function(field, value) {
  this.stats[field] = value;
  await this.save();
};

// Instance method: Increment play count
artistSchema.methods.incrementPlayCount = async function() {
  this.stats.totalPlays += 1;
  await this.save({ validateBeforeSave: false });
};

// Static method: Find verified artists
artistSchema.statics.findVerified = function() {
  return this.find({ isVerified: true, isActive: true });
};

// Static method: Find featured artists
artistSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ featuredAt: -1 })
    .limit(limit);
};

// Static method: Find popular artists
artistSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ 'stats.totalFollowers': -1 })
    .limit(limit);
};

// Static method: Search artists
artistSchema.statics.searchArtists = function(query, limit = 20) {
  return this.find({
    isActive: true,
    $or: [
      { artistName: { $regex: query, $options: 'i' } },
      { bio: { $regex: query, $options: 'i' } }
    ]
  })
  .sort({ 'stats.totalFollowers': -1 })
  .limit(limit);
};

const Artist = mongoose.model('Artist', artistSchema);

module.exports = Artist;