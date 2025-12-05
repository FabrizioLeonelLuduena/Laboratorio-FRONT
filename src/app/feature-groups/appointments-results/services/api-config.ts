/*
import { environment } from '../../../../environments/environment';
// NO USAR MAS ESTO
/!**
 * API Configuration for Appointments & Results feature
 *
 * This configuration ensures the service communicates through the proxy-server
 * instead of directly with the backend.
 *
 * Development Flow:
 * Frontend (Angular :4200) → Proxy Server (:3000) → Backend (Java :8080)
 *
 * The proxy-server configuration is in proxy-server/.env:
 * - PORT=3000 (proxy port)
 * - TARGET_API=http://localhost:8010/api (backend URL)
 *
 * @example
 * In development: /api/v1/appointment-configurations
 * Proxy rewrites to: http://localhost:8010/api/v1/appointment-configurations
 *
 * @deprecated This file is deprecated. Use environment.apiUrl directly in services instead.
 * @example
 * // Old way (deprecated):
 * private readonly apiUrl = getApiUrl('appointments');
 *
 * // New way (recommended):
 * private readonly apiUrl = `${environment.apiUrl}/v1/appointments`;
 *!/

/!**
 * API Configuration interface
 *!/
interface ApiConfig {
  /!** Base URL for the API - uses environment.apiUrl *!/
  baseUrl: string;
  /!** API version prefix *!/
  version: string;
}

/!**
 * Gets the API configuration based on the environment.
 *
 * @returns The API configuration object with baseUrl and version
 * @deprecated Use environment.apiUrl directly instead
 *!/
export function getApiConfig(): ApiConfig {
  return {
    baseUrl: environment.apiUrl,
    version: 'v1'
  };
}

/!**
 * Constructs the full API URL for a given endpoint
 *
 * @param endpoint - The API endpoint (e.g., 'appointment-configurations')
 * @returns The full URL to use in HTTP requests
 *
 * @example
 * getApiUrl('appointment-configurations')
 * // Returns: '/api/v1/appointment-configurations'
 *
 * @deprecated Use environment.apiUrl directly instead:
 * @example
 * const url = `${environment.apiUrl}/v1/appointment-configurations`;
 *!/
export function getApiUrl(endpoint: string): string {
  const config = getApiConfig();
  return `${config.baseUrl}/v1/${endpoint}`;
}
*/
