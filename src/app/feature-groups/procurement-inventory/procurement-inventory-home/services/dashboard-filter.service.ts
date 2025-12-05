import { Injectable, signal } from '@angular/core';

import { ReportingFilters } from '../models/reporting-metrics.model';

/**
 * Centralized service for managing dashboard filters.
 * Provides a single source of truth for filter state across all dashboard components.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardFilterService {
  /**
   * Current active filters
   */
  private readonly _filters = signal<ReportingFilters>({
    dateFrom: null,
    dateTo: null,
    provider: null,
    location: null,
    supply: null
  });

  /**
   * Read-only signal exposing current filters
   */
  readonly filters = this._filters.asReadonly();

  /**
   * Updates all filters at once
   * @param filters New filter values
   */
  setFilters(filters: ReportingFilters): void {
    this._filters.set(filters);
  }

  /**
   * Updates a single filter property
   * @param key Filter property to update
   * @param value New value for the filter
   */
  updateFilter<K extends keyof ReportingFilters>(key: K, value: ReportingFilters[K]): void {
    this._filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  /**
   * Resets all filters to their default values
   */
  resetFilters(): void {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    this._filters.set({
      dateFrom: yearStart,
      dateTo: today,
      provider: null,
      location: null,
      supply: null
    });
  }

  /**
   * Gets current filters as plain object (useful for API calls)
   */
  getFiltersSnapshot(): ReportingFilters {
    return { ...this._filters() };
  }

  /**
   * Checks if any filter (other than date range) is currently active
   */
  hasActiveFilters(): boolean {
    const current = this._filters();
    return !!(current.provider || current.location || current.supply);
  }

  /**
   * Formats date for API requests (yyyy-MM-dd)
   */
  formatDateForApi(date: Date | null): string | null {
    if (!date) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Gets formatted date range for display
   */
  getFormattedDateRange(): string {
    const current = this._filters();
    if (!current.dateFrom || !current.dateTo) {
      return 'Sin rango de fecha';
    }

    const from = current.dateFrom.toLocaleDateString('es-AR');
    const to = current.dateTo.toLocaleDateString('es-AR');
    return `${from} - ${to}`;
  }
}
