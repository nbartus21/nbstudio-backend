/**
 * Logger utility for standardized logging across the application
 * Provides different log levels and consistent formatting
 */
const logger = {
  /**
   * Log regular informational messages
   * @param {string} message - Main log message
   * @param {any} data - Optional data to log with the message
   */
  info: (message, data = null) => {
    if (data) {
      console.log(message, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console.log(message);
    }
  },

  /**
   * Log error messages
   * @param {string} message - Error description
   * @param {Error|string} error - Error object or message
   */
  error: (message, error = null) => {
    if (error) {
      console.error(message, error.message || error);
    } else {
      console.error(message);
    }
  },

  /**
   * Log debug messages (only in non-production environments)
   * @param {string} message - Debug message
   * @param {any} data - Optional data to log with the message
   */
  debug: (message, data = null) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data) {
        console.log(`[DEBUG] ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Log API requests (only basic info in production)
   * @param {object} req - Express request object
   */
  request: (req) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`${req.method} ${req.url}`);
    } else {
      console.log(`${req.method} ${req.url} from ${req.ip}`);
    }
  },

  /**
   * Conditional logging based on environment variable
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  development: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      if (data) {
        console.log(`[DEV] ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } else {
        console.log(`[DEV] ${message}`);
      }
    }
  }
};

export default logger; 