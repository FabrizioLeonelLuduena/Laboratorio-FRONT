/**
 * Standard API error response structure.
 * Used for consistent error handling across the application.
 */
export interface ErrorApi {
  /** HTTP status code */
  status: number;
  /** Error message */
  message: string;
  /** Detailed error description */
  detail?: string;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** API path where the error occurred */
  path: string;
  /** Additional error details or validation errors */
  errors?: Record<string, string[]>;
}

/**
 * HTTP Error response structure for type-safe error handling
 */
export interface HttpErrorResponse {
  /** HTTP status code */
  status?: number;
  /** Error message */
  message?: string;
  /** URL where the error occurred */
  url?: string;
  /** Nested error object */
  error?: {
    message?: string;
    error?: string;
    detail?: string;
    timestamp?: string;
    errors?: Record<string, string[]>;
  };
}

/**
 * Common error codes for appointment configuration operations.
 */
export enum AppointmentConfigurationErrorCodes {
  /** Configuration overlaps with existing one */
  CONFIGURATION_OVERLAP = 'CONFIGURATION_OVERLAP',
  /** Invalid date range */
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  /** Invalid time range */
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  /** Optimistic locking conflict */
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  /** Cannot delete configuration with existing appointments */
  HAS_EXISTING_APPOINTMENTS = 'HAS_EXISTING_APPOINTMENTS',
  /** Branch not found */
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND'
}
