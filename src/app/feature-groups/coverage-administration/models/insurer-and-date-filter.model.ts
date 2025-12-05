/**
 * Model for filters by insurer and date range.
 */
export interface InsurerAndDateFilter {
  insurerId?: number | null;
  insurerName?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}
