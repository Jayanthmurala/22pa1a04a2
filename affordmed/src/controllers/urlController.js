const urlService = require("../services/urlService");
const { asyncHandler } = require("../middleware/errorHandler");
const { logger } = require("../middleware/logger");

class UrlController {
  async createShortUrl(req, res) {
    try {
      const result = await urlService.createShortUrl(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          details: result.details,
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error("Controller error in createShortUrl", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getUrlStats(req, res) {
    try {
      const { shortcode } = req.params;
      const result = await urlService.getUrlStats(shortcode);

      if (!result.success) {
        const statusCode = result.statusCode || 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          details: result.details,
        });
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error("Controller error in getUrlStats", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async redirectToUrl(req, res) {
    try {
      const { shortcode } = req.params;
      const result = await urlService.redirectToUrl(shortcode, req);

      if (!result.success) {
        const statusCode = result.statusCode || 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
        });
      }

      res.redirect(result.data.originalUrl);
    } catch (error) {
      logger.error("Controller error in redirectToUrl", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async deleteUrl(req, res) {
    try {
      const { shortcode } = req.params;
      const result = await urlService.deleteUrl(shortcode);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error("Controller error in deleteUrl", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getHealth(req, res) {
    try {
      const healthStatus = await urlService.getHealthStatus();

      const statusCode = healthStatus.status === "healthy" ? 200 : 503;
      res.status(statusCode).json({
        success: true,
        data: healthStatus,
      });
    } catch (error) {
      logger.error("Controller error in getHealth", { error: error.message });
      res.status(503).json({
        success: false,
        error: "Service unavailable",
      });
    }
  }

  async getDocs(req, res) {
    const documentation = {
      message: "URL Shortener Microservice API Documentation",
      version: "1.0.0",
      endpoints: {
        "POST /shorturls": {
          description: "Create a shortened URL",
          requestBody: {
            url: "string (required) - The long URL to shorten",
            validity:
              "number (optional) - Expiration time in minutes (default: 30)",
            shortcode: "string (optional) - Custom shortcode",
          },
          response: {
            success: "boolean",
            data: {
              shortLink: "string - The shortened URL",
              expiry: "string - ISO 8601 timestamp",
            },
          },
          example: {
            request: {
              url: "https://example.com/very-long-url",
              validity: 60,
              shortcode: "my-custom-code",
            },
            response: {
              success: true,
              data: {
                shortLink: "http://localhost:3000/my-custom-code",
                expiry: "2024-01-01T12:00:00.000Z",
              },
            },
          },
        },
        "GET /shorturls/:shortcode": {
          description: "Get URL statistics and analytics",
          parameters: {
            shortcode: "string (required) - The shortcode to look up",
          },
          response: {
            success: "boolean",
            data: {
              totalClicks: "number - Total number of clicks",
              originalUrl: "string - The original long URL",
              createdAt: "string - ISO 8601 timestamp",
              expiry: "string - ISO 8601 timestamp",
              clickEvents:
                "array - Array of click events with geolocation data",
            },
          },
        },
        "GET /:shortcode": {
          description: "Redirect to the original URL (tracks click)",
          parameters: {
            shortcode: "string (required) - The shortcode to redirect",
          },
          response: "HTTP 302 redirect to the original URL",
        },
        "DELETE /shorturls/:shortcode": {
          description: "Delete a shortened URL",
          parameters: {
            shortcode: "string (required) - The shortcode to delete",
          },
          response: {
            success: "boolean",
            message: "string - Success message",
          },
        },
        "GET /health": {
          description: "Get service health status",
          response: {
            success: "boolean",
            data: {
              status: "string - healthy/unhealthy",
              timestamp: "string - ISO 8601 timestamp",
              services: "object - Health status of dependencies",
            },
          },
        },
        "GET /docs": {
          description: "Get this API documentation",
          response: "This documentation object",
        },
      },
      errorCodes: {
        400: "Bad Request - Invalid input data",
        404: "Not Found - URL not found",
        410: "Gone - URL has expired",
        409: "Conflict - Shortcode already exists",
        429: "Too Many Requests - Rate limit exceeded",
        500: "Internal Server Error - Server error",
        503: "Service Unavailable - Service unhealthy",
      },
      features: [
        "Custom shortcodes",
        "URL validity period",
        "Click tracking with geolocation",
        "Rate limiting",
        "Health checks",
      ],
    };

    res.json(documentation);
  }
}

const urlController = new UrlController();

module.exports = urlController;
