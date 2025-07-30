const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { logger } = require('../middleware/logger');

/**
 * Generate JWT token
 */
function generateToken(user) {
  try {
    const payload = {
      email: user.email,
      name: user.name,
      rollNo: user.rollNo,
      accessCode: user.accessCode,
      clientID: user.clientID,
      clientSecret: user.clientSecret
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      subject: user.email,
      jwtid: user.clientID
    });

    logger.info('JWT token generated', { email: user.email, clientID: user.clientID });
    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', { error: error.message, user: user.email });
    throw error;
  }
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
    
    logger.debug('JWT token verified', { email: decoded.email });
    return decoded;
  } catch (error) {
    logger.warn('JWT token verification failed', { error: error.message });
    return null;
  }
}

/**
 * Generate client credentials
 */
function generateClientCredentials() {
  const clientID = uuidv4();
  const clientSecret = generateRandomString(16);
  
  return { clientID, clientSecret };
}

/**
 * Generate random string
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Extract token from authorization header
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Get token expiration time
 */
function getTokenExpiration() {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + (24 * 60 * 60); // 24 hours
  return expiration;
}

module.exports = {
  generateToken,
  verifyToken,
  generateClientCredentials,
  generateRandomString,
  extractTokenFromHeader,
  getTokenExpiration
}; 