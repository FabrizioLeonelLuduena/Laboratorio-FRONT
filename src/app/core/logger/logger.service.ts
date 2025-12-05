import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { extractFileName, extractCallerName } from '../../shared/utils/stack-trace.util';

/**
 * Enum representing different log levels
 * @enum {number}
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4 // Disable all console logging
}

/**
 * Interface representing a log entry
 * @interface LogEntry
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;
    data?: any;
    stack?: string;
    url?: string;
    userAgent?: string;
    sessionId?: string;
    // Caller information
    caller?: string;
    callerFile?: string;
    callerLine?: number;
    callerColumn?: number;
}

/**
 * Centralized logging service for the application
 * Provides structured logging with different levels (DEBUG, INFO, WARN, ERROR)
 * Automatically sanitizes sensitive data and formats console output
 *
 * @example
 * ```typescript
 * constructor(private logger: LoggerService) {}
 *
 * this.logger.info('User logged in', 'AuthComponent', { userId: 123 });
 * this.logger.error('Failed to load data', 'DataService', error);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly logLevel: LogLevel;
  private readonly sessionId: string;

  /**
         * Initializes the logger service and generates a unique session ID
         */
  constructor(private http: HttpClient) {
    // In production, only log errors to console
    // In development, log everything for debugging
    this.logLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;
    this.sessionId = this.generateSessionId();
  }

  /**
           * Logs a DEBUG level message
           * Only shown in development environment
           * @param {string} message - The log message
           * @param {string} [context] - Optional context (e.g., component/service name)
           * @param {any} [data] - Optional additional data to log
           */
  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
           * Logs an INFO level message
           * Used for general informational messages
           * @param {string} message - The log message
           * @param {string} [context] - Optional context (e.g., component/service name)
           * @param {any} [data] - Optional additional data to log
           */
  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
           * Logs a WARN level message
           * Used for potentially harmful situations
           * @param {string} message - The log message
           * @param {string} [context] - Optional context (e.g., component/service name)
           * @param {any} [data] - Optional additional data to log
           */
  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
           * Logs an ERROR level message
           * Used for error events that might still allow the application to continue
           * @param {string} message - The error message
           * @param {string} [context] - Optional context (e.g., component/service name)
           * @param {Error | any} [error] - Optional error object
           */
  error(message: string, context?: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, context, error, error?.stack);
  }

  /**
           * Main logging method that processes and formats log entries
           * @private
           * @param {LogLevel} level - The log level
           * @param {string} message - The log message
           * @param {string} [context] - Optional context
           * @param {any} [data] - Optional data
           * @param {string} [stack] - Optional stack trace
           */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    stack?: string
  ): void {
    if (level < this.logLevel) {
      return;
    }

    // Capture caller information from stack trace
    const callerInfo = this.getCallerInfo();

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data: this.sanitizeData(data),
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      ...callerInfo
    };

    this.logToConsole(logEntry);

  }

  /**
           * Outputs log entry to browser console with formatting
           * @private
           * @param {LogEntry} entry - The log entry to output
           */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] [${levelName}]${entry.context ? ` [${entry.context}]` : ''}:`;

    // Enrich data with caller info if available
    const enrichedData = entry.data ? { ...entry.data } : {};
    if (entry.caller || entry.callerFile) {
      enrichedData._caller = {
        method: entry.caller,
        file: entry.callerFile,
        line: entry.callerLine,
        column: entry.callerColumn
      };
    }

    /* eslint-disable no-console */
    switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(prefix, entry.message);
      if (Object.keys(enrichedData).length > 0) {
        console.debug('  Data:', enrichedData);
      }
      break;
    case LogLevel.INFO:
      console.info(prefix, entry.message);
      if (Object.keys(enrichedData).length > 0) {
        console.info('  Data:', enrichedData);
      }
      break;
    case LogLevel.WARN:
      console.warn(prefix, entry.message);
      if (Object.keys(enrichedData).length > 0) {
        console.warn('  Data:', enrichedData);
      }
      break;
    case LogLevel.ERROR:
      console.error(prefix, entry.message);
      if (Object.keys(enrichedData).length > 0) {
        console.error('  Error Details:', enrichedData);
      }
      if (entry.stack) {
        console.error('  Stack trace:', entry.stack);
      }
      break;
    }
    /* eslint-enable no-console */
  }

  /**
           * Sanitizes sensitive data from log entries
           * Removes passwords, tokens, API keys, and other sensitive information
           * @private
           * @param {any} data - The data to sanitize
           * @returns {any} Sanitized data with sensitive fields redacted
           */
  private sanitizeData(data: any): any {
    if (!data) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));

    const sensitiveFields = [
      'password',
      'token',
      'authorization',
      'apiKey',
      'secret',
      'creditCard',
      'ssn'
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      Object.keys(obj).forEach((key) => {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
           * Gets information about the caller (component/file/line) from stack trace
           * @private
           * @returns {object} Object with caller information
           */
  private getCallerInfo(): {
        caller?: string;
        callerFile?: string;
        callerLine?: number;
        callerColumn?: number;
        } {
    try {
      // Create an error to get the stack trace
      const stack = new Error().stack;
      if (!stack) {
        return {};
      }

      const lines = stack.split('\n');

      // Find the first line that's NOT from LoggerService or Angular internals
      // We need to skip:
      // 0: Error
      // 1: getCallerInfo (logger.service.ts)
      // 2: log (logger.service.ts)
      // 3: info/debug/warn/error (logger.service.ts)
      // 4+: Potential caller or interceptor/internal

      let foundLoggerEnd = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip lines from logger.service.ts
        if (line.includes('logger.service')) {
          foundLoggerEnd = true;
          continue;
        }

        // Only start checking after we've passed all logger.service frames
        if (!foundLoggerEnd) {
          continue;
        }

        // Skip logging.interceptor.ts (it's not the real caller)
        if (line.includes('logging.interceptor')) {
          continue;
        }

        // Skip Angular internal frames
        if (
          line.includes('node_modules') ||
                    line.includes('angular/core') ||
                    line.includes('zone.js') ||
                    line.includes('webpack') ||
                    line.includes('rxjs') ||
                    line.includes('Subscriber') ||
                    line.includes('Observable')
        ) {
          continue;
        }

        // Chrome/Edge pattern: at ComponentName.method (file:line:column)
        const chromeMatch = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
        if (chromeMatch) {
          const [, callerMethod, filePath, lineNum, colNum] = chromeMatch;
          const fileName = extractFileName(filePath);
          const caller = extractCallerName(callerMethod || fileName);

          return {
            caller,
            callerFile: fileName,
            callerLine: parseInt(lineNum, 10),
            callerColumn: parseInt(colNum, 10)
          };
        }

        // Firefox/Safari pattern: method@file:line:column
        const firefoxMatch = line.match(/(.+?)@(.+?):(\d+):(\d+)/);
        if (firefoxMatch) {
          const [, method, filePath, lineNum, colNum] = firefoxMatch;
          const fileName = extractFileName(filePath);
          const caller = extractCallerName(method || fileName);

          return {
            caller,
            callerFile: fileName,
            callerLine: parseInt(lineNum, 10),
            callerColumn: parseInt(colNum, 10)
          };
        }
      }
    } catch {
      // Silently fail if we can't get caller info
    }

    return {};
  }


  /**
           * Generates a unique session ID for tracking logs across a user session
           * @private
           * @returns {string} Unique session identifier
           */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
           * Gets the current session ID
           * @returns {string} Current session identifier
           */
  getSessionId(): string {
    return this.sessionId;
  }


}

