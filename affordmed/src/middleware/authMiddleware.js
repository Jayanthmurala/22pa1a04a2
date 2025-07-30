/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

const { extractTokenFromHeader } = require('../utils/authUtils');
const authService = require('../services/authService');
const { logger } = require('./logger');

/**
 * Middleware to authenticate requests
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
    }

    // Verify token and get user
    const result = await authService.verifyTokenAndGetUser(token);
    
    if (!result.success) {
      return res.status(result.statusCode || 401).json({
        success: false,
        error: result.error
      });
    }

    // Attach user to request object
    req.user = result.data;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Allows requests to proceed with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const result = await authService.verifyTokenAndGetUser(token);
      if (result.success) {
        req.user = result.data;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', { error: error.message });
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to check if user is registered
 */
const requireRegistration = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.isRegistered) {
      return res.status(403).json({
        success: false,
        error: 'User not registered',
        message: 'Please complete registration before accessing this resource'
      });
    }

    next();
  } catch (error) {
    logger.error('Registration check middleware error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Registration check failed'
    });
  }
};

/**
 * Middleware to log authentication attempts
 */
const logAuthAttempt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasToken = !!extractTokenFromHeader(authHeader);
  
  logger.info('Authentication attempt', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    hasToken,
    userAgent: req.get('User-Agent')
  });
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRegistration,
  logAuthAttempt
}; 