const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../middleware/logger');

/**
 * MongoDB Service
 * Handles all database operations using Mongoose
 */
class MongoService {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.isConnected) {
        return;
      }

      this.connection = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      this.isConnected = true;

      logger.info('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState
    };
  }

  /**
   * Health check for MongoDB
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'MongoDB not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', message: 'MongoDB is responding' };
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return { status: 'unhealthy', message: error.message };
    }
  }

  /**
   * Get database instance
   */
  getDb() {
    return mongoose.connection.db;
  }

  /**
   * Get mongoose instance
   */
  getMongoose() {
    return mongoose;
  }
}

// Export singleton instance
module.exports = new MongoService(); 