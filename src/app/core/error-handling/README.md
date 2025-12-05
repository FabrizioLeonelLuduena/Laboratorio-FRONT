## Global Error Handling (Angular)

### Overview

This GlobalErrorHandler is aligned with a “LoggerService-first” policy: it retrieves `LoggerService` via the Angular `Injector`, classifies errors (HTTP, Template, Async, JS), builds a structured payload, and calls `logger.error(message, context, data)`. It never uses console APIs and never throws. If `LoggerService` is not available, the handler swallows the error to avoid breaking the app lifecycle.

Key goals:
- Safe dependency handling using `Injector` (no circular deps during bootstrap)
- No console usage from the handler
- Uniform, timestamped error entries with context and details
- Error classification: HTTP, Template, Async, JS

---

## Full Source: GlobalErrorHandler (TypeScript)

See file: `src/app/core/error-handling/global-error-handler.ts`

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector } from '@angular/core';

import { extractCallerName, extractFileName } from '../../shared/utils/stack-trace.util';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // No in-memory buffer; this handler relies solely on LoggerService

  constructor(private injector: Injector) {
    // Best-effort capture of unhandled promise rejections
    try {
      window.addEventListener('unhandledrejection', (evt) => {
        const reason = (evt as PromiseRejectionEvent).reason as any;
        const err = reason instanceof Error ? reason : new Error(this.stringifyUnknown(reason));
        (err as any).__origin = 'async';
        this.safeHandle(err, 'async');
      });
    } catch { /* ignore (SSR/tests) */ }
  }

  handleError(error: Error | HttpErrorResponse): void {
    this.safeHandle(error, 'zone');
  }

  // Safe handler: never throws; no console usage
  private safeHandle(error: any, origin?: 'async' | 'zone' | 'direct'): void {
    try {
      // LoggerService optional dependency: do not break if unavailable
      const logger = this.tryGetLogger();
      const timestamp = new Date().toISOString();
      const { context, message, payload } = this.normalizeError(error, timestamp, origin);

      // Prefer logger; if unavailable, swallow silently (policy: no console)
      try {
        if (logger) {
          if (error instanceof HttpErrorResponse) {
            logger.error(message, context, payload);
          } else {
            const errObj = error instanceof Error ? error : new Error(String(error));
            logger.error(message, context, errObj);
          }
        }
      } catch { /* ignore logger failures */ }
    } catch { /* swallow silently */ }
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) return `Error de red: ${error.error.message}`;
    switch (error.status) {
      case 0: return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      case 400: return `Solicitud inválida: ${this.extractErrorMessage(error)}`;
      case 401: return 'No autorizado. Por favor, inicia sesión nuevamente.';
      case 403: return 'No tienes permisos para realizar esta acción.';
      case 404: return `Recurso no encontrado: ${error.url}`;
      case 500:
      case 502: return 'Error interno del servidor. Por favor, intenta más tarde.';
      case 503: return 'Servicio no disponible. Por favor, intenta más tarde.';
      default: return `Error ${error.status}: ${this.extractErrorMessage(error)}`;
    }
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string') return error.error;
    if (error.error?.message) return error.error.message;
    if (error.error?.error) return error.error.error;
    return error.statusText || 'Error desconocido';
  }

  private extractSourceLocation(stack?: string): { file?: string; line?: number; column?: number; component?: string; location?: string } {
    if (!stack) return {};
    try {
      const lines = stack.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('node_modules') || line.includes('angular/core') || line.includes('zone.js') || line.includes('webpack')) continue;
        const chrome = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
        if (chrome) {
          const [, compMeth, filePath, ln, col] = chrome;
          const fileName = extractFileName(filePath);
          const component = extractCallerName(compMeth || fileName);
          return { file: fileName, line: +ln, column: +col, component, location: `${component} (${fileName}:${ln}:${col})` };
        }
        const ff = line.match(/(.+?)@(.+?):(\d+):(\d+)/);
        if (ff) {
          const [, method, filePath, ln, col] = ff;
          const fileName = extractFileName(filePath);
          const component = extractCallerName(method || fileName);
          return { file: fileName, line: +ln, column: +col, component, location: `${component} (${fileName}:${ln}:${col})` };
        }
      }
    } catch { /* ignore */ }
    return {};
  }

  private normalizeError(error: any, timestamp: string, origin?: 'async' | 'zone' | 'direct'):
  { context: string; message: string; payload: any } {
    if (error instanceof HttpErrorResponse) {
      const context = 'HTTP Error';
      const message = this.getHttpErrorMessage(error);
      const payload = { timestamp, name: error.name, message: error.message, status: error.status, statusText: error.statusText, url: error.url, error: error.error, kind: 'http', origin: origin || (error as any).__origin || 'zone' };
      return { context, message, payload };
    }
    const appError: Error = this.coerceToError(error);
    const isTemplate = this.isTemplateError(appError);
    const isAsync = origin === 'async' || (appError as any).__origin === 'async';
    const context = isTemplate ? 'Template Error' : isAsync ? 'Async Error' : 'Application Error';
    const message = appError.message || 'Error desconocido';
    const source = this.extractSourceLocation(appError.stack);
    const payload = { timestamp, name: appError.name, message: appError.message, stack: appError.stack, ...source, kind: isTemplate ? 'template' : isAsync ? 'async' : 'js', origin: origin || (appError as any).__origin || 'zone' };
    return { context, message, payload };
  }

  private tryGetLogger(): LoggerService | null {
    try { return this.injector.get(LoggerService); } catch { return null; }
  }

  private coerceToError(input: any): Error {
    if (input instanceof Error) return input;
    try { const e = new Error(this.stringifyUnknown(input)); (e as any).original = input; return e; } catch { return new Error('Unknown error'); }
  }

  private stringifyUnknown(val: any): string {
    try { return typeof val === 'string' ? val : JSON.stringify(val); } catch { return String(val); }
  }

  private isTemplateError(err: Error): boolean {
    const s = err?.stack || '';
    return s.includes('.component.html') || s.includes('TemplateRef') || s.includes('ng://') || s.includes('Angular');
  }

  // No buffering helpers; rely solely on LoggerService
}
```

---

## Detailed Explanation

- Injection via `Injector`
  - Avoids circular dependencies during bootstrap. Retrieval is wrapped in try/catch so missing logger never breaks handling.

- No console fallback
  - If `LoggerService` is missing or throws, the handler swallows the log (and never throws). This avoids leaking console calls and respects linting policies.

- Logging & formatting
  - When available, `LoggerService.error(message, context, payload)` receives a uniform payload with `timestamp`, `context`, `message`, and details.
  - The handler does not decide sinks; LoggerService may route to console in dev, or to remote systems.

- Error type handling
  - HTTP (HttpErrorResponse): friendly message + `status`, `statusText`, `url`, backend `error`.
  - Template: detected via stack markers (`.component.html`, `TemplateRef`, `ng://`).
  - Async: `unhandledrejection` flows with `origin='async'` and context “Async Error”.
  - JS: default case “Application Error”.
  - Adds `timestamp`, `kind`, `origin`, and parsed source location when available.

---

## Simple Test Scenarios

Use LoggerService outputs (e.g., it may route to console in dev) to validate behavior.

1) JavaScript error
```js
throw new Error('Test error');
```

2) HTTP error (simulate via interceptor that forces 500)
```ts
// Register temporarily with provideHttpClient(withInterceptors(...)) in app.config.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';

export const force500Interceptor: HttpInterceptorFn = (req) => throwError(() => ({
  name: 'HttpErrorResponse', message: 'Forced 500', status: 500, statusText: 'Internal Server Error', url: req.url,
  error: { detail: 'Simulated server error' }
} as any));
```

3) Template error
```html
<div>{{ undefinedVar.prop }}</div>
```

4) Async error
```js
Promise.reject(new Error('Async error test'));
```

---

## Expected Output (Logger)

| Error Type | Context           | Logger payload (shape)                                  |
|------------|-------------------|---------------------------------------------------------|
| JS         | Application Error | `{ timestamp, name, message, stack, file?, line?, ...}` |
| HTTP       | HTTP Error        | `{ timestamp, status, statusText, url, error, ... }`    |
| Template   | Template Error    | `{ timestamp, name, message, stack, file, component }`  |
| Async      | Async Error       | `{ timestamp, name, message, stack, origin:'async' }`   |

Notes:
- In dev, if LoggerService routes to console, you’ll see `[ISO] [ERROR] [<Context>]: <message>`.

---

## Real Output Example

LoggerService example (dev console sink):

```
[2025-01-01T12:00:00.000Z] [ERROR] [Application Error]: Test error
```

Buffer is not used in this design.

---

## Final Verification Checklist

- [ ] Provider is registered: `{ provide: ErrorHandler, useClass: GlobalErrorHandler }`
- [ ] No console usage in the handler
- [ ] JS error captured with context “Application Error”
- [ ] HTTP error captured with context “HTTP Error” and details
- [ ] Template error labeled “Template Error”
- [ ] Async rejection labeled “Async Error”
- [ ] Logger receives structured payload in dev
--

---

## Future Integration (Optional): Sentry or External Reporting

Recommendations:
- Enable only in production envs; use sampling (e.g., 0.1–1%)
- Include session id and user context where available (sanitized)
- Redact PII; align with LoggerService’s sanitize strategy
- Rate-limit and use backoff to avoid cascade failures

Example hook (pseudocode):
```ts
try {
  if (environment.production) {
    Sentry.captureException(error, {
      level: 'error',
      tags: { context, kind: payload?.kind, origin: payload?.origin },
      extra: payload,
    });
  }
} catch { /* never break the handler */ }
```



