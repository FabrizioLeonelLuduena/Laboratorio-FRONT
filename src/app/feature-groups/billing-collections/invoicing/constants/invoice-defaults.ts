/**
 * Default values for invoice creation
 * These values should be configured based on the backend configuration (application.properties)
 */

/**
 * Default company ID from backend configuration
 * TODO: Consider moving this to environment config if it varies per environment
 */
export const DEFAULT_COMPANY_ID = '97405';

/**
 * Default currency ID
 * '1' represents ARS (Argentine Peso)
 * TODO: Consider making this configurable if multi-currency support is needed
 */
export const DEFAULT_CURRENCY_ID = '1';

/**
 * Default currency code
 */
export const DEFAULT_CURRENCY_CODE = 'ARS';
