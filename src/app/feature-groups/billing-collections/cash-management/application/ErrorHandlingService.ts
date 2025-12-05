import { Injectable } from '@angular/core';

/**
 * Represents a standardized application error.
 */
export interface AppError {
  /** User-friendly message describing the error. */
  message: string;
  /** Optional error category (e.g., 'business', 'network'). */
  category?: string;
  /** Optional technical details or raw error data. */
  details?: unknown;
}

/**
 * Handles and formats application errors globally.
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  /**
   * Converts any HTTP or runtime error into a normalized {@link AppError}.
   * @param error - Raw error object.
   * @param context - Optional operation metadata.
   * @returns Standardized error object.
   */
  captureHttpError(error: unknown, context?: { operation: string; data?: unknown }): AppError {
    const err = error as { error?: { message?: string }; message?: string };

    const message =
      err?.error?.message ||
      err?.message ||
      `Error during operation: ${context?.operation ?? 'unknown'}`;

    return { message, category: 'business', details: error };
  }
}
