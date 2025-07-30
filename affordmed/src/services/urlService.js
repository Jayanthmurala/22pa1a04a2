/**
 * URL Service
 * Core business logic for URL shortening operations
 */

const Url = require('../models/Url');
const geoIpService = require('./geoIp');
const shortcodeGenerator = require('../utils/shortcodeGenerator');
const { validateUrlRequest, validateShortcode, sanitizeUrl, validateCustomShortcode } = require('../utils/validators');
const { logger } = require('../middleware/logger');
const config = require('../config/config');

class UrlService {
  constructor() {
    this.baseUrl = config.shortener.baseUrl;
  }

  /**
   * Create a shortened URL
   */
  async createShortUrl(data) {
    try {
      // Validate input
      const validation = validateUrlRequest(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          details: validation.errors
        };
      }

      const { url, validity, shortcode } = validation.data;
      const sanitizedUrl = sanitizeUrl(url);
      const expiryMinutes = validity || config.shortener.defaultValidity;

      // Handle custom shortcode
      let finalShortcode = shortcode;
      if (shortcode) {
        const shortcodeValidation = validateShortcode(shortcode);
        if (!shortcodeValidation.isValid) {
          return {
            success: false,
            error: 'Invalid shortcode format',
            details: shortcodeValidation.error
          };
        }

        const availabilityCheck = await validateCustomShortcode(shortcode);
        if (!availabilityCheck.isValid) {
          return {
            success: false,
            error: 'Shortcode not available',
            details: availabilityCheck.error
          };
        }

        finalShortcode = shortcodeValidation.shortcode;
      } else {
        // Generate unique shortcode
        finalShortcode = await shortcodeGenerator.generateUnique();
      }

      // Create URL document
      const urlDoc = new Url({
        shortcode: finalShortcode,
        originalUrl: sanitizedUrl,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        clickCount: 0,
        clickEvents: []
      });

      // Save to MongoDB
      await urlDoc.save();

      // Create response
      const response = {
        shortLink: urlDoc.shortLink,
        expiry: urlDoc.expiresAt.toISOString()
      };

      logger.info('URL shortened successfully', {
        shortcode: finalShortcode,
        originalUrl: sanitizedUrl,
        expiry: urlDoc.expiresAt
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      logger.error('Failed to create short URL', { error: error.message, data });
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return {
          success: false,
          error: 'Shortcode already exists',
          details: 'Please try again or provide a different shortcode'
        };
      }

      return {
        success: false,
        error: 'Failed to create short URL',
        details: error.message
      };
    }
  }

  /**
   * Get URL statistics
   */
  async getUrlStats(shortcode) {
    try {
      // Validate shortcode
      const shortcodeValidation = validateShortcode(shortcode);
      if (!shortcodeValidation.isValid) {
        return {
          success: false,
          error: 'Invalid shortcode format',
          details: shortcodeValidation.error
        };
      }

      const normalizedShortcode = shortcodeValidation.shortcode;
      const urlDoc = await Url.findByShortcode(normalizedShortcode);

      if (!urlDoc) {
        return {
          success: false,
          error: 'URL not found',
          statusCode: 404
        };
      }

      // Check if URL is expired
      if (urlDoc.isExpired) {
        return {
          success: false,
          error: 'URL has expired',
          statusCode: 410
        };
      }

      const response = {
        totalClicks: urlDoc.clickCount,
        originalUrl: urlDoc.originalUrl,
        createdAt: urlDoc.createdAt.toISOString(),
        expiry: urlDoc.expiresAt.toISOString(),
        clickEvents: urlDoc.clickEvents.map(event => ({
          timestamp: event.timestamp.toISOString(),
          referrer: event.referrer,
          geoLocation: event.geoLocation
        }))
      };

      logger.info('URL stats retrieved', { shortcode: normalizedShortcode });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      logger.error('Failed to get URL stats', { shortcode, error: error.message });
      return {
        success: false,
        error: 'Failed to get URL statistics',
        details: error.message
      };
    }
  }

  /**
   * Redirect to original URL
   */
  async redirectToUrl(shortcode, req) {
    try {
      // Validate shortcode
      const shortcodeValidation = validateShortcode(shortcode);
      if (!shortcodeValidation.isValid) {
        return {
          success: false,
          error: 'Invalid shortcode format',
          statusCode: 400
        };
      }

      const normalizedShortcode = shortcodeValidation.shortcode;
      const urlDoc = await Url.findByShortcode(normalizedShortcode);

      if (!urlDoc) {
        return {
          success: false,
          error: 'URL not found',
          statusCode: 404
        };
      }

      // Check if URL is expired
      if (urlDoc.isExpired) {
        return {
          success: false,
          error: 'URL has expired',
          statusCode: 410
        };
      }

      // Get client IP and geolocation
      const clientIp = geoIpService.getClientIp(req);
      const geoLocation = await geoIpService.getLocation(clientIp);

      // Create click event
      const clickEvent = {
        timestamp: new Date(),
        referrer: req.get('Referer') || 'Direct',
        geoLocation,
        userAgent: req.get('User-Agent')
      };

      // Add click event to URL document
      await urlDoc.addClickEvent(clickEvent);

      logger.info('URL redirect successful', {
        shortcode: normalizedShortcode,
        originalUrl: urlDoc.originalUrl,
        clientIp,
        clicks: urlDoc.clickCount
      });

      return {
        success: true,
        data: {
          originalUrl: urlDoc.originalUrl,
          clickEvent: {
            timestamp: clickEvent.timestamp.toISOString(),
            referrer: clickEvent.referrer,
            geoLocation: clickEvent.geoLocation
          }
        }
      };
    } catch (error) {
      logger.error('Failed to redirect URL', { shortcode, error: error.message });
      return {
        success: false,
        error: 'Failed to redirect to URL',
        details: error.message
      };
    }
  }

  /**
   * Delete a shortened URL
   */
  async deleteUrl(shortcode) {
    try {
      // Validate shortcode
      const shortcodeValidation = validateShortcode(shortcode);
      if (!shortcodeValidation.isValid) {
        return {
          success: false,
          error: 'Invalid shortcode format'
        };
      }

      const normalizedShortcode = shortcodeValidation.shortcode;
      const urlDoc = await Url.findOne({ shortcode: normalizedShortcode });

      if (!urlDoc) {
        return {
          success: false,
          error: 'URL not found'
        };
      }

      // Deactivate the URL
      await urlDoc.deactivate();

      logger.info('URL deleted successfully', { shortcode: normalizedShortcode });

      return {
        success: true,
        message: 'URL deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete URL', { shortcode, error: error.message });
      return {
        success: false,
        error: 'Failed to delete URL',
        details: error.message
      };
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const mongoService = require('./mongoService');
      const mongoHealth = await mongoService.healthCheck();
      
      return {
        status: mongoHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          mongodb: mongoHealth
        }
      };
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Clean up expired URLs
   */
  async cleanupExpiredUrls() {
    try {
      const expiredUrls = await Url.getExpiredUrls();
      let cleanedCount = 0;

      for (const urlDoc of expiredUrls) {
        await urlDoc.deactivate();
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired URLs`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired URLs', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const urlService = new UrlService();

module.exports = urlService; 