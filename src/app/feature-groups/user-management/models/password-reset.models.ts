/**
 * DTOs for the password recovery flow
 */

/**
 * Request to initiate password reset
 */
export interface ResetRequestDTO {
  data: string;
}

/**
 * Request to set a new password
 */
export interface NewPasswordRequestDTO {
  token: string;
  newPassword: string;
}

/**
 * Generic backend response for password reset operations
 */
export interface PasswordResetResponse {
  message: string;
}

/**
 * Backend error response structure
 * Matches ar.edu.utn.frc.tup.p4.dtos.ErrorResponse from the backend
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  error: string;
}

/**
 * Specific error codes returned by the backend
 */
export enum PasswordResetErrorCode {
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  ILLEGALARGUMENT_ERROR = 'ILLEGALARGUMENT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_EMPTY = 'EMAIL_EMPTY',
  EMAIL_INVALID = 'EMAIL_INVALID',
  TOKEN_INVALID_OR_EXPIRED = 'TOKEN_INVALID_OR_EXPIRED',
  TOKEN_EMPTY = 'TOKEN_EMPTY',
  TOKEN_FORMAT_INVALID = 'TOKEN_FORMAT_INVALID',
  PASSWORD_EMPTY = 'PASSWORD_EMPTY',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_INVALID = 'PASSWORD_INVALID',
  NEW_PASSWORD_MUST_DIFFER = 'NEW_PASSWORD_MUST_DIFFER',
}

/**
 * DTO to send a token to the backend.
 * Matches ar.edu.utn.frc.tup.p4.dtos.TokenDTO from the backend.
 */
export interface TokenDTO {
  token: string;
}
