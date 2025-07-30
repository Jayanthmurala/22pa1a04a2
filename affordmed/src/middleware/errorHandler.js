const { logger } = require("./logger");

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  if (!error.isOperational) {
    error = new AppError(error.message || "Internal server error", 500);
  }

  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Send error response
  const response = {
    success: false,
    error: error.message,
    statusCode: error.statusCode,
  };

  // Add details if available
  if (error.details) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const error = new AppError("Validation failed", 400, err.details);
    return next(error);
  }
  next(err);
};

const joiErrorHandler = (err, req, res, next) => {
  if (err.isJoi) {
    const error = new AppError("Validation failed", 400, err.details);
    return next(error);
  }
  next(err);
};

const mongoErrorHandler = (err, req, res, next) => {
  // Handle MongoDB connection errors
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    const error = new AppError("Database connection failed", 503);
    return next(error);
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const error = new AppError("Duplicate key error", 409);
    return next(error);
  }

  // Handle MongoDB validation errors
  if (err.name === "ValidationError") {
    const error = new AppError("Data validation failed", 400, err.message);
    return next(error);
  }

  // Handle MongoDB cast errors (invalid ObjectId, etc.)
  if (err.name === "CastError") {
    const error = new AppError("Invalid data format", 400);
    return next(error);
  }

  next(err);
};

module.exports = {
  AppError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  validationErrorHandler,
  joiErrorHandler,
  mongoErrorHandler,
};
