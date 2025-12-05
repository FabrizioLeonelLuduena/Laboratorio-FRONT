/**
 * Pre-analytical data helper utilities
 * Functions for formatting and transforming pre-analytical data for exports
 */

/**
 * Formats date string
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return date;
}

/**
 * Gets the protocol number as string
 */
export function getProtocol(protocol: string | number | null | undefined): string {
  if (protocol === null || protocol === undefined) return '-';
  return protocol.toString();
}

/**
 * Gets patient name or placeholder
 */
export function getPatientName(patientName: string | null | undefined): string {
  return patientName || '-';
}

/**
 * Gets area or placeholder
 */
export function getArea(area: string | null | undefined): string {
  return area || '-';
}

/**
 * Gets status or placeholder
 */
export function getStatus(status: string | null | undefined): string {
  return status || '-';
}

/**
 * Gets previous action or placeholder
 */
export function getPreviousAction(previousAction: string | null | undefined): string {
  return previousAction || '-';
}

/**
 * Gets previous user or placeholder
 */
export function getPreviousUser(previousUser: string | null | undefined): string {
  return previousUser || '-';
}
