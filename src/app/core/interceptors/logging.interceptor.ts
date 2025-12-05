import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';

import { throwError } from 'rxjs';

import { tap, catchError } from 'rxjs/operators';

import { LoggerService } from '../logger/logger.service';

/**
 * HTTP interceptor for logging all requests and responses
 * Automatically logs:
 * - Outgoing HTTP requests with method, URL, headers, and body
 * - Incoming HTTP responses with status, duration, and body
 * - HTTP errors with status, duration, and error details
 * 
 * Each request gets a unique requestId for tracking
 * Sensitive headers (authorization, x-user-id, cookie) are automatically redacted
 * 
 * @example
 * Register in app.config.ts:
 * ```typescript
 * provideHttpClient(withInterceptors([loggingInterceptor]))
 * ```
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const startTime = Date.now();

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  logger.debug(
    `→ HTTP ${req.method} ${req.url}`,
    'HTTP Request',
    {
      requestId,
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      body: req.body
    }
  );

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const duration = Date.now() - startTime;
        const statusClass = getStatusClass(event.status);

        logger.info(
          `← HTTP ${req.method} ${req.url} ${event.status} (${duration}ms)`,
          'HTTP Response',
          {
            requestId,
            method: req.method,
            url: req.url,
            status: event.status,
            statusText: event.statusText,
            duration,
            statusClass,
            body: event.body
          }
        );
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const duration = Date.now() - startTime;

      // Extract more detailed error information
      const errorDetails = {
        requestId,
        method: req.method,
        url: req.url,
        fullUrl: error.url || req.url,
        status: error.status,
        statusText: error.statusText,
        duration,
        errorBody: error.error,
        errorMessage: error.message,
        errorName: error.name,
        // Additional context
        headers: sanitizeHeaders(error.headers || req.headers),
        requestBody: req.body
      };

      // Log with appropriate level based on status
      if (error.status >= 500) {
        logger.error(
          `✗ HTTP ${req.method} ${req.url} ${error.status} Server Error (${duration}ms)`,
          'HTTP Server Error',
          errorDetails
        );
      } else if (error.status >= 400) {
        logger.warn(
          `✗ HTTP ${req.method} ${req.url} ${error.status} Client Error (${duration}ms)`,
          'HTTP Client Error',
          errorDetails
        );
      } else {
        logger.error(
          `✗ HTTP ${req.method} ${req.url} ${error.status} (${duration}ms)`,
          'HTTP Error',
          errorDetails
        );
      }

      return throwError(() => error);
    })
  );
};

/**
 * Sanitizes sensitive headers before logging
 * Redacts authorization, x-user-id, and cookie headers
 * @param {any} headers - HTTP headers to sanitize
 * @returns {any} Sanitized headers object
 */
function sanitizeHeaders(headers: any): any {
  const sanitized: any = {};
  const sensitiveHeaders = ['authorization', 'x-user-id', 'cookie'];

  headers.keys().forEach((key: string) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = headers.get(key);
    }
  });

  return sanitized;
}

/**
 * Gets the HTTP status class category
 * @param {number} status - HTTP status code
 * @returns {string} Status class (success, redirect, client-error, server-error, unknown)
 */
function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return 'unknown';
}

