const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Handles user registration and authentication
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNo: {
    type: String,
    required: true,
    trim: true
  },
  githubUsername: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accessCode: {
    type: String,
    required: true,
    trim: true
  },
  clientID: {
    type: String,
    unique: true,
    required: true
  },
  clientSecret: {
    type: String,
    required: true
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ rollNo: 1 });
userSchema.index({ clientID: 1 });

// Pre-save middleware to hash client secret
userSchema.pre('save', async function(next) {
  if (this.isModified('clientSecret')) {
    this.clientSecret = await bcrypt.hash(this.clientSecret, 12);
  }
  next();
});

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by roll number
userSchema.statics.findByRollNo = function(rollNo) {
  return this.findOne({ rollNo: rollNo });
};

// Static method to find by client ID
userSchema.statics.findByClientID = function(clientID) {
  return this.findOne({ clientID: clientID });
};

// Static method to check if user is already registered
userSchema.statics.isUserRegistered = function(email) {
  return this.exists({ email: email.toLowerCase(), isRegistered: true });
};

// Instance method to compare client secret
userSchema.methods.compareClientSecret = async function(candidateSecret) {
  return await bcrypt.compare(candidateSecret, this.clientSecret);
};

// Instance method to mark as registered
userSchema.methods.markAsRegistered = function() {
  this.isRegistered = true;
  return this.save();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 