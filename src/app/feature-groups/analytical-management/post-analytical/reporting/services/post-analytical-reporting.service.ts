import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Observable, timeout } from 'rxjs';
import * as XLSX from 'xlsx';

import { environment } from '../../../../../../environments/environment';
import {
  AgeGroupGenderReport,
  OutOfRangeReport,
  ReportingFilters,
  ScreeningResultsReport,
  ValidatedResultsReport
} from '../models/post-analytical-reports.model';

/**
 * Service to manage post-analytical reporting.
 * Handles backend calls and report state.
 */
@Injectable({
  providedIn: 'root'
})
export class PostAnalyticalReportingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/post-analytical/reporting`;

  // ════════════════════════════════════════════════════════════════
  // Signals to store report data
  // ════════════════════════════════════════════════════════════════

  readonly validatedReport = signal<ValidatedResultsReport | null>(null);
  readonly outOfRangeReport = signal<OutOfRangeReport | null>(null);
  readonly ageGenderReport = signal<AgeGroupGenderReport | null>(null);
  readonly screeningReport = signal<ScreeningResultsReport | null>(null);

  // ════════════════════════════════════════════════════════════════
  // Public methods to fetch reports
  // ════════════════════════════════════════════════════════════════

  /**
   * Gets the validated results report.
   */
  getValidatedResultsReport(filters: ReportingFilters): Observable<ValidatedResultsReport> {
    const params = this.buildHttpParams(filters);
    return this.http.get<ValidatedResultsReport>(`${this.apiUrl}/validated-results`, { params })
      .pipe(timeout(30000)); // 30 seconds timeout
  }

  /**
   * Gets the out-of-range results report.
   */
  getOutOfRangeReport(filters: ReportingFilters): Observable<OutOfRangeReport> {
    const params = this.buildHttpParams(filters);
    return this.http.get<OutOfRangeReport>(`${this.apiUrl}/out-of-range-results`, { params })
      .pipe(timeout(30000)); // 30 seconds timeout
  }


  /**
   * Gets the age group and gender statistics report.
   */
  getAgeGroupGenderReport(filters: ReportingFilters): Observable<AgeGroupGenderReport> {
    const params = this.buildHttpParams(filters);
    return this.http.get<AgeGroupGenderReport>(`${this.apiUrl}/age-group-gender-statistics`, { params })
      .pipe(timeout(30000)); // 30 seconds timeout
  }

  /**
   * Gets the screening results report.
   */
  getScreeningResultsReport(filters: ReportingFilters): Observable<ScreeningResultsReport> {
    const params = this.buildHttpParams(filters);
    return this.http.get<ScreeningResultsReport>(`${this.apiUrl}/screening-results`, { params })
      .pipe(timeout(30000)); // 30 seconds timeout
  }

  // ════════════════════════════════════════════════════════════════
  // Utility methods
  // ════════════════════════════════════════════════════════════════

  /**
   * Builds HttpParams from filters.
   */
  private buildHttpParams(filters: ReportingFilters): HttpParams {
    let params = new HttpParams();

    if (filters.startDate) {
      // Start date goes with 00:00:00 in local timezone
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      params = params.set('startDate', this.toLocalISOString(startDate));
    }
    if (filters.endDate) {
      // End date goes with 23:59:59.999 to include the whole day in local timezone
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      params = params.set('endDate', this.toLocalISOString(endDate));
    }
    if (filters.minAge !== undefined && filters.minAge !== null) {
      params = params.set('minAge', filters.minAge.toString());
    }
    if (filters.maxAge !== undefined && filters.maxAge !== null) {
      params = params.set('maxAge', filters.maxAge.toString());
    }
    if (filters.gender) {
      params = params.set('gender', filters.gender);
    }
    if (filters.analysisId !== undefined && filters.analysisId !== null) {
      params = params.set('analysisId', filters.analysisId.toString());
    }
    if (filters.resultValue) {
      params = params.set('resultValue', filters.resultValue);
    }

    return params;
  }

  /**
   * Converts a Date to ISO string format but in local timezone (not UTC).
   * This prevents the date from shifting when converted.
   * Example: 2025-11-27 00:00:00 local -> "2025-11-27T00:00:00.000"
   */
  private toLocalISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * Calculates percentage with 1 decimal place.
   */
  calculatePercentage(part: number, total: number): string {
    if (total === 0) return '0.0';
    return ((part / total) * 100).toFixed(1);
  }

  /**
   * Exports data to Excel using xlsx with Spanish headers.
   * @param data Array of objects to export
   * @param columns Array of columns with field and header
   * @param fileName Excel file name
   */
  exportToExcel(data: any[], columns: { field: string; header: string }[], fileName: string): void {
    if (!data || data.length === 0) {
      return;
    }


    const mappedData = data.map(row => {
      const newRow: any = {};
      columns.forEach(col => {
        newRow[col.header] = row[col.field];
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(mappedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Formats a date range for file names in DD-MM-YYYY format.
   */
  getDateRangeString(startDate?: Date, endDate?: Date): string {
    const start = startDate || new Date();
    const end = endDate || new Date();

    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    return `Desde_${formatDate(start)}_Hasta_${formatDate(end)}`;
  }


  /**
   * Formats a date in DD/MM/YYYY format.
   * Handles ISO strings without timezone conversion to prevent date shifting.
   */
  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';

    let d: Date;

    if (typeof date === 'string') {
      // Parse ISO string as local time to avoid UTC conversion
      // Input: "2025-11-27T00:00:00" or "2025-11-27"
      const dateOnly = date.split('T')[0]; // Extract "2025-11-27"
      const [year, month, day] = dateOnly.split('-').map(Number);
      d = new Date(year, month - 1, day); // Month is 0-indexed
    } else {
      d = date;
    }

    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formats a date and time in DD/MM/YYYY HH:mm format.
   */
  formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;

    // Validate that the date is valid
    if (isNaN(d.getTime())) return '-';

    const dateStr = this.formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
  }
}

