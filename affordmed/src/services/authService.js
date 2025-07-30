const User = require("../models/User");
const {
  generateToken,
  generateClientCredentials,
  getTokenExpiration,
} = require("../utils/authUtils");
const {
  validateRegistration,
  validateAuthentication,
} = require("../utils/authValidators");
const { logger } = require("../middleware/logger");

class AuthService {
  /**
   * Register a new user
   */
  async registerUser(data) {
    try {
      // Validate input
      const validation = validateRegistration(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        };
      }

      const { email, name, mobileNo, githubUsername, rollNo, accessCode } =
        validation.data;

      // Check if user is already registered
      const existingUser = await User.isUserRegistered(email);
      if (existingUser) {
        return {
          success: false,
          error:
            "You can register only once. Do not forget to save your clientID and retrieve them again.",
          statusCode: 409,
        };
      }

      // Check if roll number already exists
      const existingRollNo = await User.findByRollNo(rollNo);
      if (existingRollNo) {
        return {
          success: false,
          error: "Roll number already exists",
          statusCode: 409,
        };
      }

      // Generate client credentials
      const { clientID, clientSecret } = generateClientCredentials();

      // Create user document
      const user = new User({
        email,
        name,
        mobileNo,
        githubUsername,
        rollNo,
        accessCode,
        clientID,
        clientSecret,
        isRegistered: true,
      });

      // Save to database
      await user.save();

      // Create response
      const response = {
        email: user.email,
        name: user.name,
        rollNo: user.rollNo,
        accessCode: user.accessCode,
        clientID: user.clientID,
        clientSecret: clientSecret, // Return the original secret, not the hashed one
      };

      logger.info("User registered successfully", {
        email: user.email,
        rollNo: user.rollNo,
        clientID: user.clientID,
      });

      return {
        success: true,
        data: response,
        message:
          "You can register only once. Do not forget to save your clientID and retrieve them again.",
      };
    } catch (error) {
      logger.error("Failed to register user", { error: error.message, data });

      // Handle duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return {
          success: false,
          error: `${field} already exists`,
          statusCode: 409,
        };
      }

      return {
        success: false,
        error: "Failed to register user",
        details: error.message,
      };
    }
  }

  /**
   * Authenticate user and generate token
   */
  async authenticateUser(data) {
    try {
      // Validate input
      const validation = validateAuthentication(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        };
      }

      const { email, name, rollNo, accessCode, clientID, clientSecret } =
        validation.data;

      // Find user by client ID
      const user = await User.findByClientID(clientID);
      if (!user) {
        return {
          success: false,
          error: "Invalid credentials",
          statusCode: 401,
        };
      }

      // Verify user details
      if (
        user.email !== email ||
        user.name !== name ||
        user.rollNo !== rollNo ||
        user.accessCode !== accessCode
      ) {
        return {
          success: false,
          error: "Invalid credentials",
          statusCode: 401,
        };
      }

      // Verify client secret
      const isValidSecret = await user.compareClientSecret(clientSecret);
      if (!isValidSecret) {
        return {
          success: false,
          error: "Invalid credentials",
          statusCode: 401,
        };
      }

      // Check if user is registered
      if (!user.isRegistered) {
        return {
          success: false,
          error: "User not registered",
          statusCode: 401,
        };
      }

      // Update last login
      await user.updateLastLogin();

      // Generate JWT token
      const token = generateToken(user);
      const expiresIn = getTokenExpiration();

      // Create response
      const response = {
        token_type: "Bearer",
        access_token: token,
        expires_in: expiresIn,
      };

      logger.info("User authenticated successfully", {
        email: user.email,
        clientID: user.clientID,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error("Failed to authenticate user", {
        error: error.message,
        data,
      });
      return {
        success: false,
        error: "Failed to authenticate user",
        details: error.message,
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          statusCode: 404,
        };
      }

      const response = {
        email: user.email,
        name: user.name,
        mobileNo: user.mobileNo,
        githubUsername: user.githubUsername,
        rollNo: user.rollNo,
        accessCode: user.accessCode,
        clientID: user.clientID,
        isRegistered: user.isRegistered,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error("Failed to get user profile", {
        error: error.message,
        userId,
      });
      return {
        success: false,
        error: "Failed to get user profile",
        details: error.message,
      };
    }
  }

  /**
   * Verify token and get user
   */
  async verifyTokenAndGetUser(token) {
    try {
      const { verifyToken } = require("../utils/authUtils");
      const decoded = verifyToken(token);

      if (!decoded) {
        return {
          success: false,
          error: "Invalid token",
          statusCode: 401,
        };
      }

      // Find user by client ID
      const user = await User.findByClientID(decoded.clientID);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          statusCode: 401,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error("Failed to verify token", { error: error.message });
      return {
        success: false,
        error: "Token verification failed",
        details: error.message,
      };
    }
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
