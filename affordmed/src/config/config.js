require("dotenv").config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || "0.0.0.0",
    env: process.env.NODE_ENV || "development",
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "jayanthmurala",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    issuer: "Affordmed",
    audience: "url-shortener-api",
  },

  // URL Shortener Configuration
  shortener: {
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
    defaultValidity: 30, // minutes
    maxValidity: 1440, // 24 hours in minutes
    shortcodeLength: 8,
    reservedShortcodes: [
      "api",
      "docs",
      "health",
      "admin",
      "shorturls",
      "auth",
      "register",
    ],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
  },

  // Geo IP Service Configuration
  geoIp: {
    serviceUrl: "http://ip-api.com/json",
    timeout: 5000,
  },

  // CORS Configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"],
  },
};

module.exports = config;
