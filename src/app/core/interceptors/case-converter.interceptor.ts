import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';

import { Observable, map } from 'rxjs';

/**
 * Recursively converts the keys of an object or array using the provided converter function.
 *
 * @param obj - The object or array to process.
 * @param converter - A function that takes a key string and returns the transformed key.
 * @returns A new object or array with transformed keys.
 */
function convertKeys(obj: unknown, converter: (key: string) => string): unknown {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeys(item, converter));
  }

  if (Object.prototype.toString.call(obj) === '[object Object]') {
    return Object.fromEntries(
      Object.entries(obj as object).map(([key, value]) => [
        converter(key),
        convertKeys(value, converter)
      ])
    );
  }

  return obj;
}

/**
 * Converts a camelCase string to snake_case.
 *
 * @param key - The camelCase string.
 * @returns The converted snake_case string.
 */
const keyToSnakeCase = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/**
 * Converts a snake_case string to camelCase.
 *
 * @param key - The snake_case string.
 * @returns The converted camelCase string.
 */
const keyToCamelCase = (key: string) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Functional HTTP interceptor that automatically converts object keys
 * between camelCase (used in the frontend) and snake_case (expected by the backend).
 *
 * - Converts outgoing request bodies from camelCase → snake_case.
 * - Converts incoming response bodies from snake_case → camelCase.
 *
 * This helps ensure consistent data format handling between frontend and backend
 * without manually transforming every request or response.
 *
 * @param req - The outgoing HTTP request.
 * @param next - The next handler in the HTTP request pipeline.
 * @returns An observable of the HTTP event with converted request and response bodies.
 */
export const caseConverterInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  // Convert the request body to snake_case before sending it to the backend
  const snakeCaseReq = req.clone({
    body: convertKeys(req.body, keyToSnakeCase)
  });

  return next(snakeCaseReq).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        // Convert the response body to camelCase before passing it to the app
        return event.clone({ body: convertKeys(event.body, keyToCamelCase) });
      }
      return event;
    })
  );
};
