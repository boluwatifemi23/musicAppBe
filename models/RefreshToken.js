// models/RefreshToken.js - Refresh Token Model (For Remember Me)

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
  // Device Information (for security & "logout from all devices")
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
      type: String, // Browser fingerprint
      default: 'Unknown'
    },
    deviceName: {
      type: String, // e.g., "Chrome on Windows"
      default: 'Unknown Device'
    }
  },
  expiresAt: {
    type: Date,
    required: true,
    // index: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 0 // TTL index - MongoDB will auto-delete when expiresAt is reached
  }
}, {
  timestamps: true
});

// Indexes
// refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ deviceId: 1 });
// refreshTokenSchema.index({ expiresAt: 1 }); // For TTL
refreshTokenSchema.index({ isRevoked: 1 });

// TTL index - automatically delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method: Check if token is valid
refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && new Date() < this.expiresAt;
};

// Instance method: Revoke token
refreshTokenSchema.methods.revoke = async function() {
  this.isRevoked = true;
  await this.save();
};

// Static method: Find valid token
refreshTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method: Revoke all user tokens (logout from all devices)
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId) {
  return this.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true }
  );
};

// Static method: Get user's active sessions
refreshTokenSchema.statics.getUserSessions = function(userId) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method: Revoke specific device token
refreshTokenSchema.statics.revokeDeviceToken = async function(userId, deviceId) {
  return this.updateMany(
    { userId, 'deviceInfo.deviceId': deviceId, isRevoked: false },
    { isRevoked: true }
  );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;