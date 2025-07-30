/**
 * Validation Utilities
 * Provides validation functions for the URL shortener microservice
 */

const Joi = require('joi');
const Url = require('../models/Url');
const { logger } = require('../middleware/logger');

/**
 * URL validation schema
 */
const urlSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
      'any.required': 'URL is required'
    }),
  validity: Joi.number()
    .integer()
    .min(1)
    .max(1440) // 24 hours in minutes
    .optional()
    .default(30)
    .messages({
      'number.base': 'Validity must be a number',
      'number.integer': 'Validity must be an integer',
      'number.min': 'Validity must be at least 1 minute',
      'number.max': 'Validity cannot exceed 24 hours (1440 minutes)'
    }),
  shortcode: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(20)
    .optional()
    .messages({
      'string.pattern.base': 'Shortcode can only contain letters, numbers, hyphens, and underscores',
      'string.min': 'Shortcode must be at least 3 characters long',
      'string.max': 'Shortcode cannot exceed 20 characters'
    })
});

/**
 * Shortcode validation schema
 */
const shortcodeSchema = Joi.string()
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .min(3)
  .max(20)
  .required()
  .messages({
    'string.pattern.base': 'Shortcode can only contain letters, numbers, hyphens, and underscores',
    'string.min': 'Shortcode must be at least 3 characters long',
    'string.max': 'Shortcode cannot exceed 20 characters',
    'any.required': 'Shortcode is required'
  });

/**
 * Validate URL creation request
 */
function validateUrlRequest(data) {
  try {
    const { error, value } = urlSchema.validate(data, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('URL validation failed', { data, errors });
      return { isValid: false, errors };
    }
    
    return { isValid: true, data: value };
  } catch (error) {
    logger.error('Validation error', { error: error.message });
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation error occurred' }] };
  }
}

/**
 * Validate shortcode
 */
function validateShortcode(shortcode) {
  try {
    const { error, value } = shortcodeSchema.validate(shortcode);
    
    if (error) {
      logger.warn('Shortcode validation failed', { shortcode, error: error.details[0].message });
      return { isValid: false, error: error.details[0].message };
    }
    
    return { isValid: true, shortcode: value };
  } catch (error) {
    logger.error('Shortcode validation error', { error: error.message });
    return { isValid: false, error: 'Shortcode validation error occurred' };
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize URL
 */
function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Ensure protocol is present
    if (!urlObj.protocol) {
      urlObj.protocol = 'https:';
    }
    
    // Remove trailing slash from pathname
    if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (error) {
    logger.error('URL sanitization failed', { url, error: error.message });
    return url;
  }
}

/**
 * Check if shortcode is reserved
 */
function isReservedShortcode(shortcode) {
  const config = require('../config/config');
  return config.shortener.reservedShortcodes.includes(shortcode.toLowerCase());
}

/**
 * Validate custom shortcode availability
 */
async function validateCustomShortcode(shortcode) {
  try {
    // Check if it's a reserved shortcode
    if (isReservedShortcode(shortcode)) {
      return { 
        isValid: false, 
        error: 'This shortcode is reserved and cannot be used' 
      };
    }
    
    // Check if shortcode already exists in MongoDB
    const exists = await Url.shortcodeExists(shortcode);
    if (exists) {
      return { 
        isValid: false, 
        error: 'This shortcode is already in use' 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    logger.error('Custom shortcode validation failed', { shortcode, error: error.message });
    return { 
      isValid: false, 
      error: 'Failed to validate shortcode availability' 
    };
  }
}

module.exports = {
  validateUrlRequest,
  validateShortcode,
  isValidUrl,
  sanitizeUrl,
  isReservedShortcode,
  validateCustomShortcode
}; 