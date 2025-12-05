/**
 * Studies data helper utilities
 * Functions for formatting and transforming studies data for exports
 */

/**
 * Formats date to DD/MM/YYYY HH:mm format
 */
export function formatDate(date: string | null | undefined): string {
  return date || '-';
}

/**
 * Gets protocol code or placeholder
 */
export function getProtocolCode(code: string | null | undefined): string {
  return code || '-';
}

/**
 * Gets patient document or placeholder
 */
export function getPatientDocument(doc: string | null | undefined): string {
  return doc || '-';
}

/**
 * Gets patient name or placeholder
 */
export function getPatientName(name: string | null | undefined): string {
  return name || '-';
}

/**
 * Gets signature status label or placeholder
 */
export function getSignatureStatus(status: string | null | undefined): string {
  return status || '-';
}
