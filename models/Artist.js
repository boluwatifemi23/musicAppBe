
const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    
  },
 
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
  

  genres: [{
    type: String,
    trim: true
  }],
  
  
  socialLinks: {
    instagram: String,
    twitter: String,
    facebook: String,
    youtube: String,
    spotify: String,
    website: String
  },
  
 
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  
  
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
  
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredAt: Date,
  
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


artistSchema.index({ artistName: 1 });
artistSchema.index({ userId: 1 });
artistSchema.index({ isVerified: 1 });
artistSchema.index({ 'stats.totalFollowers': -1 }); 
artistSchema.index({ createdAt: -1 });


artistSchema.virtual('songs', {
  ref: 'Song',
  localField: '_id',
  foreignField: 'artistId'
});


artistSchema.virtual('albums', {
  ref: 'Album',
  localField: '_id',
  foreignField: 'artistId'
});


artistSchema.virtual('profileUrl').get(function() {
  return `${process.env.CLIENT_URL}/artist/${this._id}`;
});


artistSchema.methods.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = Date.now();
  await this.save();
};


artistSchema.methods.updateStats = async function(field, value) {
  this.stats[field] = value;
  await this.save();
};


artistSchema.methods.incrementPlayCount = async function() {
  this.stats.totalPlays += 1;
  await this.save({ validateBeforeSave: false });
};


artistSchema.statics.findVerified = function() {
  return this.find({ isVerified: true, isActive: true });
};


artistSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ featuredAt: -1 })
    .limit(limit);
};


artistSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ 'stats.totalFollowers': -1 })
    .limit(limit);
};


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