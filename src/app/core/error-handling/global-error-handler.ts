import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector } from '@angular/core';

import { extractCallerName, extractFileName } from '../../shared/utils/stack-trace.util';
import { LoggerService } from '../logger/logger.service';

/**
 * Global error handler for the Angular application.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  /**
   * Creates an instance of GlobalErrorHandler.
   */
  constructor(private injector: Injector) {
    try {
      window.addEventListener('unhandledrejection', (evt) => {
        const reason = (evt as PromiseRejectionEvent).reason as any;
        const err = reason instanceof Error ? reason : new Error(this.stringifyUnknown(reason));
        (err as any).__origin = 'async';
        this.safeHandle(err, 'async');
      });
    } catch { /* ignore (SSR/tests) */ }
  }

  /**
   * Handles errors thrown in the Angular zone.
   */
  handleError(error: Error | HttpErrorResponse): void {
    this.safeHandle(error, 'zone');
  }

  /**
   * Handles errors safely, ensuring no exceptions are thrown from within.
   */
  private safeHandle(error: any, origin?: 'async' | 'zone' | 'direct'): void {
    try {
      // Obtain LoggerService safely to avoid circular or early-init issues
      let logger: LoggerService | null = null;
      try {
        logger = this.injector.get(LoggerService);
      } catch { /* swallow if logger unavailable */ }

      const timestamp = new Date().toISOString();
      let errorMessage = 'Unknown error';
      let errorContext = 'Application Error';
      let errorData: any = {};

      if (error instanceof HttpErrorResponse) {
        // HTTP error branch
        errorContext = 'HTTP Error';
        errorMessage = this.getHttpErrorMessage(error);
        errorData = {
          timestamp,
          name: error.name,
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        };

        if (logger) {
          logger.error(errorMessage, errorContext, errorData);
        }
        return;
      }

      // JS/Template/Async error branch
      const appError: Error = error instanceof Error ? error : new Error(this.stringifyUnknown(error));
      const isAsync = origin === 'async' || (appError as any).__origin === 'async';
      const isTemplate = this.isTemplateError(appError);
      errorContext = isTemplate ? 'Template Error' : isAsync ? 'Async Error' : 'Application Error';
      errorMessage = appError.message || 'Error desconocido';

      const sourceLocation = this.extractSourceLocation(appError.stack);
      errorData = {
        timestamp,
        name: appError.name,
        message: appError.message,
        stack: appError.stack,
        ...sourceLocation
      };

      if (logger) {
        // Keep previous compatibility: send the original Error instance for non-HTTP errors
        logger.error(errorMessage, errorContext, appError);
      }
    } catch {
      // Never throw from the global handler
    }
  }

  /**
   * Generates a user-friendly error message for HTTP errors.
   */
  private getHttpErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `Error de red: ${error.error.message}`;
    }
    switch (error.status) {
    case 0:
      return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
    case 400:
      return `Solicitud inválida: ${this.extractErrorMessage(error)}`;
    case 401:
      return 'No autorizado. Por favor, inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos para realizar esta acción.';
    case 404:
      return `Recurso no encontrado: ${error.url}`;
    case 500:
    case 502:
      return 'Error interno del servidor. Por favor, intenta más tarde.';
    case 503:
      return 'Servicio no disponible. Por favor, intenta más tarde.';
    default:
      return `Error ${error.status}: ${this.extractErrorMessage(error)}`;
    }
  }

  /**
   * Extracts a meaningful error message from an HttpErrorResponse.
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string') return error.error;
    if (error.error?.message) return error.error.message;
    if (error.error?.error) return error.error.error;
    return error.statusText || 'Error desconocido';
  }

  /**
   * Extracts source location information from a stack trace.
   */
  private extractSourceLocation(stack?: string): {
    file?: string; line?: number; column?: number; component?: string; location?: string;
  } {
    if (!stack) return {};
    try {
      const lines = stack.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (
          line.includes('node_modules') ||
          line.includes('angular/core') ||
          line.includes('zone.js') ||
          line.includes('webpack')
        ) { continue; }

        // Chrome/Edge pattern
        const chromeMatch = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
        if (chromeMatch) {
          const [, componentMethod, filePath, lineNum, colNum] = chromeMatch;
          const fileName = extractFileName(filePath);
          const component = extractCallerName(componentMethod || fileName);
          return { file: fileName, line: +lineNum, column: +colNum, component, location: `${component} (${fileName}:${lineNum}:${colNum})` };
        }

        // Firefox/Safari pattern
        const firefoxMatch = line.match(/(.+?)@(.+?):(\d+):(\d+)/);
        if (firefoxMatch) {
          const [, method, filePath, lineNum, colNum] = firefoxMatch;
          const fileName = extractFileName(filePath);
          const component = extractCallerName(method || fileName);
          return { file: fileName, line: +lineNum, column: +colNum, component, location: `${component} (${fileName}:${lineNum}:${colNum})` };
        }
      }
    } catch { /* ignore */ }
    return {};
  }

  /**
   * Stringifies unknown values safely.
   */
  private stringifyUnknown(val: any): string {
    try {
      return typeof val === 'string' ? val : JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  /**
   * Determines if an error is likely from a template.
   */
  private isTemplateError(err: Error): boolean {
    const s = err?.stack || '';
    return s.includes('.component.html') || s.includes('TemplateRef') || s.includes('ng://') || s.includes('Angular');
  }
}
