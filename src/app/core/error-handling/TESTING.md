# Testing Global Error Handler

This guide validates the GlobalErrorHandler. The handler only reports via LoggerService (no console usage). In dev, LoggerService may route output to the console, but that is outside the handler.

## What Changed (Summary)

- Uses `Injector` to retrieve `LoggerService` safely (no circular deps).
- No console usage in the handler (no console.log/console.error).
- Classifies errors: JavaScript, HTTP, Template, Async (unhandledrejection).

## How To Test

Prerequisites: The handler is registered in `app.config.ts` with `{ provide: ErrorHandler, useClass: GlobalErrorHandler }`.

Open the application and execute the scenarios below.

### 1) JavaScript Error

In the browser devtools console:

```js
throw new Error('Test error');
```

Expected:
- LoggerService emits: `[ISO] [ERROR] [Application Error]: Test error` (if it routes to console in dev), or it sends to its configured sink.
  - `context: 'Application Error'`, `message: 'Test error'`, `timestamp`, and error details (`name`, `stack`, `file`, `line`, `component`, ...)

### 2) HTTP Error (via interceptor)

Temporarily register a testing interceptor that forces a 500 (see README for snippet), then trigger any HTTP call.

Expected:
- LoggerService logs with `context: 'HTTP Error'` and payload `{ status: 500, statusText, url, error, ... }` (visible in console only if LoggerService routes there in dev).

### 3) Template Error

Add temporarily in any template:

```html
<div>{{ undefinedVar.prop }}</div>
```

Expected:
- LoggerService logs with `context: 'Template Error'` and location details (if parsed).

### 4) Async Error (Unhandled Promise Rejection)

In the browser devtools console:

```js
Promise.reject(new Error('Async error test'));
```

Expected:
- LoggerService logs with `context: 'Async Error'` and `origin: 'async'`.

## Final Checks

- [ ] No console usage in `global-error-handler.ts`
- [ ] LoggerService receives structured payloads (dev console may show its output)
- [ ] All four scenarios generate the expected `context` values and details

## Notes

- The handler never throws; failures in logger retrieval or logging do not break the app.
- Future integration with Sentry or similar can be added behind environment guards and sampling; see README.
