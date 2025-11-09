// models/Genre.js - Genre/Category Model

const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Genre name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Genre name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  coverImage: {
    url: String,
    publicId: String
  },
  color: {
    type: String,
    default: '#667eea' 
  },
  

  songCount: {
    type: Number,
    default: 0
  },
  
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


genreSchema.index({ isFeatured: 1 });


genreSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});


genreSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ songCount: -1 });
};


genreSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ songCount: -1 })
    .limit(limit);
};

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;