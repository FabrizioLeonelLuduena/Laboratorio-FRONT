/**
 * Worksheet data helper utilities
 * Functions for formatting and transforming worksheet data for exports
 */

/**
 * Gets template name or placeholder
 */
export function getTemplateName(name: string | null | undefined): string {
  return name || '-';
}
