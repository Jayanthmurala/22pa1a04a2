const { extractTokenFromHeader } = require("../utils/authUtils");
const authService = require("../services/authService");
const { logger } = require("./logger");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
        message:
          "Please provide a valid Bearer token in the Authorization header",
      });
    }

    const result = await authService.verifyTokenAndGetUser(token);

    if (!result.success) {
      return res.status(result.statusCode || 401).json({
        success: false,
        error: result.error,
      });
    }

    req.user = result.data;
    next();
  } catch (error) {
    logger.error("Authentication middleware error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

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
    logger.error("Optional authentication middleware error", {
      error: error.message,
    });

    next();
  }
};

const requireRegistration = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!req.user.isRegistered) {
      return res.status(403).json({
        success: false,
        error: "User not registered",
        message: "Please complete registration before accessing this resource",
      });
    }

    next();
  } catch (error) {
    logger.error("Registration check middleware error", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: "Registration check failed",
    });
  }
};

const logAuthAttempt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasToken = !!extractTokenFromHeader(authHeader);

  logger.info("Authentication attempt", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    hasToken,
    userAgent: req.get("User-Agent"),
  });

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRegistration,
  logAuthAttempt,
};
