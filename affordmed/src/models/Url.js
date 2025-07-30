const mongoose = require("mongoose");

const clickEventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    referrer: {
      type: String,
      default: null,
    },
    geoLocation: {
      country: String,
      region: String,
      city: String,
      ip: String,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const urlSchema = new mongoose.Schema(
  {
    shortcode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalUrl: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    clickEvents: [clickEventSchema],
    createdBy: {
      type: String,
      default: "system",
    },
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
urlSchema.index({ shortcode: 1 });
urlSchema.index({ expiresAt: 1 });
urlSchema.index({ isActive: 1 });
urlSchema.index({ createdAt: -1 });

// Virtual for checking if URL is expired
urlSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Virtual for short link
urlSchema.virtual("shortLink").get(function () {
  const config = require("../config/config");
  return `${config.shortener.baseUrl}/${this.shortcode}`;
});

// Pre-save middleware to ensure shortcode is lowercase
urlSchema.pre("save", function (next) {
  if (this.shortcode) {
    this.shortcode = this.shortcode.toLowerCase();
  }
  next();
});

// Static method to find by shortcode
urlSchema.statics.findByShortcode = function (shortcode) {
  return this.findOne({
    shortcode: shortcode.toLowerCase(),
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to check if shortcode exists
urlSchema.statics.shortcodeExists = function (shortcode) {
  return this.exists({ shortcode: shortcode.toLowerCase() });
};

// Static method to get expired URLs
urlSchema.statics.getExpiredUrls = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    isActive: true,
  });
};

// Instance method to add click event
urlSchema.methods.addClickEvent = function (clickData) {
  this.clickCount += 1;
  this.clickEvents.push(clickData);

  // Keep only last 100 click events to prevent document size issues
  if (this.clickEvents.length > 100) {
    this.clickEvents = this.clickEvents.slice(-100);
  }

  return this.save();
};

// Instance method to deactivate URL
urlSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model("Url", urlSchema);
