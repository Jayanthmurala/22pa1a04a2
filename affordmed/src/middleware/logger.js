/**
 * Custom Logging Middleware
 * Provides structured logging without using console.log
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.level = process.env.LOG_LEVEL || 'info';
    this.format = process.env.LOG_FORMAT || 'json';
  }

  /**
   * Add log entry
   */
  _addLog(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };

    this.logs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    return logEntry;
  }

  /**
   * Format log entry
   */
  _formatLog(logEntry) {
    if (this.format === 'json') {
      return JSON.stringify(logEntry);
    } else {
      return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
    }
  }

  /**
   * Write to output
   */
  _write(level, message, data = {}) {
    const logEntry = this._addLog(level, message, data);
    const formattedLog = this._formatLog(logEntry);

    if (level === 'error') {
      process.stderr.write(formattedLog + '\n');
    } else {
      process.stdout.write(formattedLog + '\n');
    }
  }

  /**
   * Info level logging
   */
  info(message, data = {}) {
    if (this._shouldLog('info')) {
      this._write('info', message, data);
    }
  }

  /**
   * Error level logging
   */
  error(message, data = {}) {
    if (this._shouldLog('error')) {
      this._write('error', message, data);
    }
  }

  /**
   * Warn level logging
   */
  warn(message, data = {}) {
    if (this._shouldLog('warn')) {
      this._write('warn', message, data);
    }
  }

  /**
   * Debug level logging
   */
  debug(message, data = {}) {
    if (this._shouldLog('debug')) {
      this._write('debug', message, data);
    }
  }

  /**
   * Check if should log based on level
   */
  _shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Create singleton logger instance
const logger = new Logger();

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Outgoing response', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logger middleware
 */
const errorLogger = (error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  next(error);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
}; 