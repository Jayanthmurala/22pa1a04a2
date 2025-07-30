const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const config = require("./config/config");
const mongoService = require("./services/mongoService");
const urlRoutes = require("./routes/urlRoutes");
const authRoutes = require("./routes/authRoutes");
const { logger, errorLogger } = require("./middleware/logger");
const {
  notFoundHandler,
  globalErrorHandler,
  joiErrorHandler,
  mongoErrorHandler,
} = require("./middleware/errorHandler");

class Server {
  constructor() {
    this.app = express();
    this.port = config.server.port;
    this.host = config.server.host;
  }

  /**
   * Initialize middleware
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable for API service
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        error: config.rateLimit.message,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Trust proxy for real IP detection
    this.app.set("trust proxy", true);
  }

  /**
   * Initialize routes
   */
  initializeRoutes() {
    // Health check endpoint
    this.app.get("/health", async (req, res) => {
      try {
        const healthStatus = await mongoService.healthCheck();
        const statusCode = healthStatus.status === "healthy" ? 200 : 503;

        res.status(statusCode).json({
          success: true,
          data: {
            status: healthStatus.status,
            timestamp: new Date().toISOString(),
            services: {
              mongodb: healthStatus,
            },
          },
        });
      } catch (error) {
        logger.error("Health check failed", { error: error.message });
        res.status(503).json({
          success: false,
          error: "Service unavailable",
          message: error.message,
        });
      }
    });

    // Authentication routes
    this.app.use("/auth", authRoutes);

    // URL shortening routes
    this.app.use("/", urlRoutes);

    // 404 handler (must be after all routes)
    this.app.use(notFoundHandler);
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // Custom error handlers
    this.app.use(joiErrorHandler);
    this.app.use(mongoErrorHandler);

    // Global error handler (must be last)
    this.app.use(globalErrorHandler);
  }

  /**
   * Initialize database connections
   */
  async initializeDatabase() {
    try {
      await mongoService.connect();
      logger.info("Database connections established");
    } catch (error) {
      logger.error("Failed to connect to database", { error: error.message });
      throw error;
    }
  }

  /**
   * Graceful shutdown handler
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close database connections
        await mongoService.disconnect();
        logger.info("Database connections closed");

        // Close server
        this.server.close(() => {
          logger.info("Server closed");
          process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
          logger.error("Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      } catch (error) {
        logger.error("Error during graceful shutdown", {
          error: error.message,
        });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection", { reason, promise });
      gracefulShutdown("unhandledRejection");
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize database connections
      await this.initializeDatabase();

      // Initialize middleware
      this.initializeMiddleware();

      // Initialize routes
      this.initializeRoutes();

      // Initialize error handling
      this.initializeErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start server
      this.server = this.app.listen(this.port, this.host, () => {
        logger.info(`URL Shortener Microservice started`, {
          port: this.port,
          host: this.host,
          environment: config.server.env,
          nodeVersion: process.version,
        });

        // Log startup information
        logger.info("Service endpoints available:", {
          "POST /auth/register": "Register new user",
          "POST /auth/auth": "Authenticate user",
          "GET /auth/verify": "Verify token (protected)",
          "GET /auth/profile": "Get user profile (protected)",
          "POST /shorturls": "Create shortened URL (protected)",
          "GET /shorturls/:shortcode": "Get URL statistics (protected)",
          "GET /:shortcode": "Redirect to original URL (public)",
          "DELETE /shorturls/:shortcode": "Delete shortened URL (protected)",
          "GET /health": "Health check (public)",
          "GET /docs": "API documentation (public)",
        });
      });

      return this.server;
    } catch (error) {
      logger.error("Failed to start server", { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info("Server stopped");
          resolve();
        });
      });
    }
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error("Failed to start application", { error: error.message });
    process.exit(1);
  });
}

module.exports = Server;
