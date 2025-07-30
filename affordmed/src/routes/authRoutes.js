/**
 * Authentication Routes
 * Defines API endpoints for authentication operations
 */

const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { requestLogger } = require('../middleware/logger');

const router = express.Router();

// Apply request logging middleware to all routes
router.use(requestLogger);

// Register new user
router.post('/register', authController.register);

// Authenticate user and get token
router.post('/auth', authController.authenticate);

// Verify token (protected route)
router.get('/verify', authenticate, authController.verifyToken);

// Get user profile (protected route)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router; 