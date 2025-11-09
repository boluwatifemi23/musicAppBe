const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  deviceInfo: {
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    ip: {
      type: String,
      default: 'Unknown'
    },
    deviceId: {
      type: String,
      default: 'Unknown'
    },
    deviceName: {
      type: String, 
      default: 'Unknown Device'
    }
  },
  expiresAt: {
    type: Date,
    required: true,

  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 0 
  }
}, {
  timestamps: true
});


refreshTokenSchema.index({ deviceId: 1 });
refreshTokenSchema.index({ isRevoked: 1 });


refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && new Date() < this.expiresAt;
};


refreshTokenSchema.methods.revoke = async function() {
  this.isRevoked = true;
  await this.save();
};


refreshTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};


refreshTokenSchema.statics.revokeAllUserTokens = async function(userId) {
  return this.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true }
  );
};


refreshTokenSchema.statics.getUserSessions = function(userId) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};


refreshTokenSchema.statics.revokeDeviceToken = async function(userId, deviceId) {
  return this.updateMany(
    { userId, 'deviceInfo.deviceId': deviceId, isRevoked: false },
    { isRevoked: true }
  );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;