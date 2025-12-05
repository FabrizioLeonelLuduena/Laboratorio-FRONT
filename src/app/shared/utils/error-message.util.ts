/**
 * Utility functions for extracting user-friendly error messages from HTTP errors
 */

/**
 * Extracts a user-friendly error message from an HTTP error response
 * 
 * @param error - The error object from HTTP request
 * @param context - Optional context string (e.g., "al cargar los proveedores")
 * @returns User-friendly error message in Spanish
 * 
 * @example
 * ```typescript
 * this.service.getData().subscribe({
 *   error: (error) => {
 *     const message = extractErrorMessage(error, 'al cargar los datos');
 *     this.showError(message);
 *   }
 * });
 * ```
 */
export function extractErrorMessage(error: any, context?: string): string {
  // Si hay errores de validación por campo (típicamente 400 o 422)
  if (error?.error?.validationErrors && typeof error.error.validationErrors === 'object') {
    const validationErrors = error.error.validationErrors;
    const fieldErrors = Object.values(validationErrors).join(', ');

    // Combinar mensaje principal con errores de campo
    const mainMessage = error.error.message || 'Error de validación';
    return `${mainMessage}: ${fieldErrors}`;
  }

  // Si hay mensaje específico del backend, usarlo (pero solo si no es un mensaje técnico HTTP)
  if (error?.error?.message && !error.error.message.includes('Http failure response')) {
    return error.error.message;
  }

  // Si hay un detalle específico del backend
  if (error?.error?.detail && !error.error.detail.includes('Http failure response')) {
    return error.error.detail;
  }

  // Si tenemos el código de estado HTTP, usar mensaje user-friendly
  if (error?.status !== undefined) {
    return getHttpErrorMessage(error.status, context);
  }

  // Fallback: mensaje genérico
  return context
    ? `Ocurrió un error inesperado ${context}. Por favor, intente nuevamente.`
    : 'Ocurrió un error inesperado. Por favor, intente nuevamente.';
}

/**
 * Gets a user-friendly message based on HTTP status code
 * 
 * @param status - HTTP status code
 * @param context - Optional context string
 * @returns User-friendly error message
 */
export function getHttpErrorMessage(status: number, context?: string): string {
  const contextMsg = context || '';

  switch (status) {
  case 0:
    return 'No se pudo conectar con el servidor. Por favor, verifique su conexión a internet.';
  case 400:
    return `Los datos enviados ${contextMsg} no son válidos. Por favor, revise la información.`;
  case 401:
    return 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
  case 403:
    return `No tiene permisos para realizar esta acción ${contextMsg}.`;
  case 404:
    return `No se encontró el recurso solicitado ${contextMsg}.`;
  case 409:
    return `Ya existe un registro con los mismos datos ${contextMsg}.`;
  case 422:
    return `Los datos proporcionados ${contextMsg} no son válidos.`;
  case 500:
    return `Ocurrió un error en el servidor ${contextMsg}. Por favor, intente nuevamente más tarde.`;
  case 502:
    return 'El servidor no está disponible temporalmente. Por favor, intente nuevamente en unos momentos.';
  case 503:
    return 'El servicio no está disponible en este momento. Por favor, intente más tarde.';
  case 504:
    return 'El servidor tardó demasiado en responder. Por favor, intente nuevamente.';
  default:
    return `Ocurrió un error inesperado ${contextMsg}. Por favor, intente nuevamente.`;
  }
}

/**
 * Checks if an error is a network error (no connection)
 * 
 * @param error - The error object
 * @returns True if it's a network error
 */
export function isNetworkError(error: any): boolean {
  return error?.status === 0 || error?.status === undefined;
}

/**
 * Checks if an error is a server error (5xx)
 * 
 * @param error - The error object
 * @returns True if it's a server error
 */
export function isServerError(error: any): boolean {
  return error?.status >= 500 && error?.status < 600;
}

/**
 * Checks if an error is a client error (4xx)
 * 
 * @param error - The error object
 * @returns True if it's a client error
 */
export function isClientError(error: any): boolean {
  return error?.status >= 400 && error?.status < 500;
}

/**
 * Checks if an error is an authentication error (401)
 * 
 * @param error - The error object
 * @returns True if it's an authentication error
 */
export function isAuthError(error: any): boolean {
  return error?.status === 401;
}

/**
 * Checks if an error is a validation error (400 or 422)
 * 
 * @param error - The error object
 * @returns True if it's a validation error
 */
export function isValidationError(error: any): boolean {
  return error?.status === 400 || error?.status === 422 ||
        (error?.error?.validationErrors && typeof error.error.validationErrors === 'object');
}

