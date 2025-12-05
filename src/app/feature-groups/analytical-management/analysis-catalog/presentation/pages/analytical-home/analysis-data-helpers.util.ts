/**
 * Analysis data helper utilities
 * Functions for formatting and transforming analysis data for exports
 */

import { Analysis } from '../../../domain/analysis.model';

/**
 * Formats date to DD/MM/YYYY format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Gets the NBU code or placeholder
 */
export function getNbuCode(analysis: Analysis): string {
  return analysis.nbu?.nbuCode?.toString() || '-';
}

/**
 * Gets the NBU determination or placeholder
 */
export function getNbuDetermination(analysis: Analysis): string {
  return analysis.nbu?.determination || '-';
}

/**
 * Gets the sample type name or placeholder
 */
export function getSampleTypeName(analysis: Analysis): string {
  return analysis.sampleType?.name || '-';
}

/**
 * Gets the family name or placeholder
 */
export function getFamilyName(analysis: Analysis): string {
  return analysis.familyName || '-';
}

/**
 * Gets the number of determinations
 */
export function getDeterminationsCount(analysis: Analysis): string {
  return analysis.determinations?.length?.toString() || '0';
}
