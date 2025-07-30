const authService = require("../services/authService");
const { logger } = require("../middleware/logger");

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.registerUser(req.body);

      if (!result.success) {
        const statusCode = result.statusCode || 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          details: result.details,
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } catch (error) {
      logger.error("Controller error in register", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async authenticate(req, res) {
    try {
      const result = await authService.authenticateUser(req.body);

      if (!result.success) {
        const statusCode = result.statusCode || 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          details: result.details,
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error("Controller error in authenticate", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user._id;
      const result = await authService.getUserProfile(userId);

      if (!result.success) {
        const statusCode = result.statusCode || 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error("Controller error in getProfile", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async verifyToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: "Authorization header required",
        });
      }

      const { extractTokenFromHeader } = require("../utils/authUtils");
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "Invalid authorization header format",
        });
      }

      const result = await authService.verifyTokenAndGetUser(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            email: result.data.email,
            name: result.data.name,
            rollNo: result.data.rollNo,
            clientID: result.data.clientID,
          },
        },
      });
    } catch (error) {
      logger.error("Controller error in verifyToken", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

const authController = new AuthController();

module.exports = authController;
