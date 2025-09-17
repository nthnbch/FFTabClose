/**
 * FFTabClose - Logger
 * Centralized logging service with debug levels
 * 
 * Version 3.1.0
 */

import { DEBUG_LEVELS, DEBUG_CONFIG } from './constants.js';

/**
 * Logger class for consistent logging throughout the extension
 */
class Logger {
  constructor() {
    this.debugLevel = DEBUG_CONFIG.LEVEL;
    this.enabled = DEBUG_CONFIG.ENABLED;
  }

  /**
   * Set the debug level
   * @param {number} level - Debug level to set
   */
  setLevel(level) {
    if (Object.values(DEBUG_LEVELS).includes(level)) {
      this.debugLevel = level;
    }
  }

  /**
   * Enable or disable logging
   * @param {boolean} enabled - Whether logging is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Format a log message with timestamp and category
   * @param {string} level - Log level
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   * @returns {string} - Formatted message
   */
  _formatMessage(level, category, message, data) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] [${category}]: ${message}`;
    
    if (data !== undefined) {
      return {
        message: formattedMessage,
        data
      };
    }
    
    return formattedMessage;
  }

  /**
   * Log an error message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  error(category, message, data) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.ERROR) {
      console.error(this._formatMessage('ERROR', category, message, data));
    }
  }

  /**
   * Log a warning message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  warn(category, message, data) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.WARN) {
      console.warn(this._formatMessage('WARN', category, message, data));
    }
  }

  /**
   * Log an info message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  info(category, message, data) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.INFO) {
      console.info(this._formatMessage('INFO', category, message, data));
    }
  }

  /**
   * Log a debug message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  debug(category, message, data) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.DEBUG) {
      console.debug(this._formatMessage('DEBUG', category, message, data));
    }
  }

  /**
   * Log a verbose message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  verbose(category, message, data) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.VERBOSE) {
      console.log(this._formatMessage('VERBOSE', category, message, data));
    }
  }
  
  /**
   * Create a log group for related logs
   * @param {string} category - Log category
   * @param {string} title - Group title
   * @param {Function} callback - Function to execute within the group
   */
  group(category, title, callback) {
    if (this.enabled && this.debugLevel >= DEBUG_LEVELS.DEBUG) {
      console.group(this._formatMessage('GROUP', category, title));
      callback();
      console.groupEnd();
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for testing
export default Logger;