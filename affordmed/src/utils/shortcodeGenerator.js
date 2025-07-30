/**
 * Shortcode Generator
 * Generates unique shortcodes for URL shortening
 */

const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const { logger } = require('../middleware/logger');
const config = require('../config/config');

class ShortcodeGenerator {
  constructor() {
    this.length = config.shortener.shortcodeLength;
    this.alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  }

  /**
   * Generate a random shortcode
   */
  generate() {
    return nanoid(this.length);
  }

  /**
   * Generate a custom shortcode with specific length
   */
  generateCustom(length = this.length) {
    return nanoid(length);
  }

  /**
   * Generate a shortcode using base62 encoding
   */
  generateBase62() {
    let result = '';
    const characters = this.alphabet;
    
    for (let i = 0; i < this.length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Generate a timestamp-based shortcode
   */
  generateTimestamp() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 2 + this.length - timestamp.length);
    return (timestamp + random).substring(0, this.length);
  }

  /**
   * Generate a sequential shortcode using MongoDB counter
   */
  async generateSequential() {
    try {
      // Use MongoDB's auto-incrementing _id or a separate counter collection
      // For simplicity, we'll use a timestamp-based approach
      return this.generateTimestamp();
    } catch (error) {
      logger.error('Failed to generate sequential shortcode', { error: error.message });
      return this.generate();
    }
  }

  /**
   * Convert number to base62 string
   */
  _numberToBase62(num) {
    const base = 62;
    const chars = this.alphabet;
    let result = '';
    
    while (num > 0) {
      result = chars[num % base] + result;
      num = Math.floor(num / base);
    }
    
    // Pad with leading zeros to maintain consistent length
    while (result.length < this.length) {
      result = chars[0] + result;
    }
    
    return result.substring(0, this.length);
  }

  /**
   * Generate a unique shortcode with collision detection
   */
  async generateUnique(maxAttempts = 10) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const shortcode = this.generate();
      
      try {
        const exists = await Url.shortcodeExists(shortcode);
        if (!exists) {
          logger.debug('Generated unique shortcode', { shortcode, attempts: attempt });
          return shortcode;
        }
      } catch (error) {
        logger.error('Failed to check shortcode uniqueness', { shortcode, error: error.message });
        // Continue to next attempt
      }
    }
    
    logger.warn('Failed to generate unique shortcode after max attempts', { maxAttempts });
    throw new Error('Unable to generate unique shortcode');
  }

  /**
   * Validate shortcode format
   */
  isValidFormat(shortcode) {
    if (!shortcode || typeof shortcode !== 'string') {
      return false;
    }
    
    // Check length
    if (shortcode.length < 3 || shortcode.length > 20) {
      return false;
    }
    
    // Check characters (alphanumeric, hyphens, underscores)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(shortcode);
  }

  /**
   * Normalize shortcode (convert to lowercase, remove special chars)
   */
  normalize(shortcode) {
    if (!shortcode) return '';
    
    return shortcode
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 20);
  }
}

// Create singleton instance
const shortcodeGenerator = new ShortcodeGenerator();

module.exports = shortcodeGenerator; 