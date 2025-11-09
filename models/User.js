const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false 
  },
  
  
  profilePicture: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/avatar-placeholder.png'
    },
    publicId: String
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  

  googleId: {
    type: String,
    unique: true,
    sparse: true 
  },
  
  
  role: {
    type: String,
    enum: ['user', 'artist', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  

  verificationOtp: {
    code: String,
    expiresAt: Date
  },
  
  
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    playbackQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high'
    }
  },
  
 
  stats: {
    totalPlays: {
      type: Number,
      default: 0
    },
    totalPlaylistsCreated: {
      type: Number,
      default: 0
    },
    totalFollowing: {
      type: Number,
      default: 0
    },
    totalFollowers: {
      type: Number,
      default: 0
    }
  },
  
  
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });


userSchema.virtual('profileUrl').get(function() {
  return `${process.env.CLIENT_URL}/profile/${this._id}`;
});


userSchema.pre('save', async function(next) {
  
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};


userSchema.methods.isOTPValid = function() {
  if (!this.verificationOtp || !this.verificationOtp.code) {
    return false;
  }
  return new Date() < new Date(this.verificationOtp.expiresAt);
};


userSchema.methods.clearVerificationOTP = function() {
  this.verificationOtp = undefined;
};

userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  await this.save({ validateBeforeSave: false });
};


userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findVerifiedUsers = function() {
  return this.find({ isVerified: true, isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;