const express = require("express");
const urlController = require("../controllers/urlController");
const {
  authenticate,
  requireRegistration,
} = require("../middleware/authMiddleware");
const { requestLogger } = require("../middleware/logger");

const router = express.Router();

// Apply request logging middleware to all routes
router.use(requestLogger);

// Create shortened URL (protected)
router.post(
  "/shorturls",
  authenticate,
  requireRegistration,
  urlController.createShortUrl
);

// Get URL statistics (protected)
router.get(
  "/shorturls/:shortcode",
  authenticate,
  requireRegistration,
  urlController.getUrlStats
);

// Delete shortened URL (protected)
router.delete(
  "/shorturls/:shortcode",
  authenticate,
  requireRegistration,
  urlController.deleteUrl
);

// Health check endpoint (public)
router.get("/health", urlController.getHealth);

// API documentation endpoint (public)
router.get("/docs", urlController.getDocs);

// Redirect endpoint (public - no authentication required)
router.get("/:shortcode", urlController.redirectToUrl);

module.exports = router;
