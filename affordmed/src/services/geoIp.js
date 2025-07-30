const axios = require('axios');
const config = require('../config/config');
const { logger } = require('../middleware/logger');

/**
 * Geo IP Service
 * Handles geolocation lookups for IP addresses
 */
class GeoIpService {
  constructor() {
    this.serviceUrl = config.geoIp.serviceUrl;
    this.timeout = config.geoIp.timeout;
  }

  /**
   * Get client IP address from request
   */
  getClientIp(req) {
    // Check various headers for real IP
    const ip = req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               req.ip ||
               '127.0.0.1';

    // Handle IPv6 format
    return ip.replace(/^::ffff:/, '');
  }

  /**
   * Check if IP is private/localhost
   */
  isPrivateIp(ip) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get location data for IP address
   */
  async getLocation(ip) {
    try {
      // Skip private/localhost IPs
      if (this.isPrivateIp(ip)) {
        logger.debug('Skipping geolocation for private IP', { ip });
        return {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          ip: ip
        };
      }

      // Make request to geolocation service
      const response = await axios.get(`${this.serviceUrl}/${ip}`, {
        timeout: this.timeout
      });

      if (response.data && response.data.status === 'success') {
        const { country, regionName, city } = response.data;
        
        logger.debug('Geolocation data retrieved', { 
          ip, 
          country, 
          region: regionName, 
          city 
        });

        return {
          country: country || 'Unknown',
          region: regionName || 'Unknown',
          city: city || 'Unknown',
          ip: ip
        };
      } else {
        logger.warn('Geolocation service returned error', { 
          ip, 
          response: response.data 
        });
        
        return {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          ip: ip
        };
      }
    } catch (error) {
      logger.error('Failed to get geolocation data', { 
        ip, 
        error: error.message 
      });
      
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        ip: ip
      };
    }
  }

  /**
   * Get location data with fallback
   */
  async getLocationWithFallback(ip) {
    try {
      return await this.getLocation(ip);
    } catch (error) {
      logger.error('Geolocation failed, using fallback', { 
        ip, 
        error: error.message 
      });
      
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        ip: ip
      };
    }
  }
}

// Export singleton instance
module.exports = new GeoIpService(); 