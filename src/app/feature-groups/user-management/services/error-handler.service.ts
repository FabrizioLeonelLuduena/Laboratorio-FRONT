import { Injectable } from '@angular/core';

import { ErrorResponse, PasswordResetErrorCode } from '../models/password-reset.models';

/**
 * Centralized service for handling backend errors.
 * It extracts error codes and translates them into user-friendly messages.
 * It prevents code duplication by following the DRY principle.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  /**
   * Extracts and translates the backend error message using error codes.
   * Implements robust, code-based error handling instead of string inspection.
   *
   * @param error - The HTTP error received from the backend
   * @param defaultMessage - Default message if the error cannot be extracted
   * @returns - User-friendly error message
   */
  getErrorMessage(error: any, defaultMessage: string): string {
    // Si el error tiene la estructura ErrorResponse del backend
    if (error?.error && typeof error.error === 'object') {
      const errorResponse = error.error as ErrorResponse;

      // Intentar extraer un "code" embebido dentro de message (p. ej.: NEW_PASSWORD_MUST_DIFFER)
      if (errorResponse.message) {
        const match = errorResponse.message.match(/"?([A-Z0-9_]+):/);
        const extractedCode = match ? match[1] : null;
        if (extractedCode) {
          return this.mapErrorCodeToMessage(extractedCode);
        }
      }

      // Usar el código de error para mapear a mensajes amigables
      if (errorResponse.error) {
        return this.mapErrorCodeToMessage(errorResponse.error);
      }

      // Si no hay código pero hay mensaje, devolverlo
      if (errorResponse.message) {
        return errorResponse.message;
      }
    }

    // Si el error es un string, intentar parsearlo
    if (typeof error?.error === 'string') {
      try {
        const parsedError = JSON.parse(error.error) as ErrorResponse;

        // Intentar extraer código desde message si viene embebido
        if (parsedError.message) {
          const match = parsedError.message.match(/"?([A-Z0-9_]+):/);
          const extractedCode = match ? match[1] : null;
          if (extractedCode) {
            return this.mapErrorCodeToMessage(extractedCode);
          }
          return parsedError.message;
        }

        if (parsedError.error) {
          return this.mapErrorCodeToMessage(parsedError.error);
        }
      } catch {
        // Si no se puede parsear, continuar al mensaje por defecto
      }
    }

    return defaultMessage;
  }

  /**
   * Map error codes to user-friendly messages.
   *
   * @param errorCode - The backend error code
   * @returns Translated user-friendly message
   */
  private mapErrorCodeToMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      // Errores de usuario/email
      [PasswordResetErrorCode.USER_NOT_FOUND]: 'No se encontró una cuenta con ese correo electrónico.',
      [PasswordResetErrorCode.EMAIL_EMPTY]: 'Debes proporcionar un correo electrónico válido.',
      [PasswordResetErrorCode.EMAIL_INVALID]: 'El formato del correo electrónico no es válido.',

      // Errores de token
      [PasswordResetErrorCode.TOKEN_INVALID_OR_EXPIRED]: 'El enlace ha expirado o ya fue utilizado. Por favor, solicita un nuevo enlace.',
      [PasswordResetErrorCode.TOKEN_EMPTY]: 'El enlace no es válido. Por favor, verifica que hayas copiado el enlace completo.',
      [PasswordResetErrorCode.TOKEN_FORMAT_INVALID]: 'El enlace no tiene un formato válido. Por favor, asegúrate de haber copiado el enlace completo del correo electrónico.',

      // Errores de password
      [PasswordResetErrorCode.PASSWORD_EMPTY]: 'La contraseña no puede estar vacía.',
      [PasswordResetErrorCode.PASSWORD_TOO_SHORT]: 'La contraseña debe tener al menos 8 caracteres.',
      [PasswordResetErrorCode.PASSWORD_INVALID]: 'La contraseña no cumple con los requisitos de seguridad.',
      [PasswordResetErrorCode.NEW_PASSWORD_MUST_DIFFER]: 'La nueva contraseña no puede ser igual a la actual.',

      // Errores generales
      [PasswordResetErrorCode.ACCESS_DENIED]: 'El enlace ha expirado, ya fue utilizado o no es válido. Por favor, solicita un nuevo enlace.',
      [PasswordResetErrorCode.ILLEGALARGUMENT_ERROR]: 'Los datos proporcionados no son válidos.',
      [PasswordResetErrorCode.RUNTIME_ERROR]: 'Ocurrió un error al procesar la solicitud.',
      [PasswordResetErrorCode.INTERNAL_SERVER_ERROR]: 'Error interno del servidor. Por favor, intenta más tarde.'
    };

    return errorMessages[errorCode] || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
  }
}
