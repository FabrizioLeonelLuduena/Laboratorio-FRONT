import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  BranchTotalKPI,
  ComparativeReportResponse,
  InsurerTypeKPI,
  InvoicedByBranchResponse,
  InvoicedByInsurerResponse,
  InvoicedCostsRatioKPI,
  InvoicedMinusCostsResponse,
  InvoicedPendingRatioKPI,
  InvoicedTotalResponse,
  InvoicedVsPendingResponse,
  MonthOverMonthGrowthKPI,
  MonthTotalKPI,
  TopInsurersKPI,
  YTDTotalKPI
} from '../models/billing-report.model';

/**
 * Service for consuming billing reports and KPIs API.
 * Maps to /api/v1/billing/reports/* endpoints.
 */
@Injectable({
  providedIn: 'root'
})
export class BillingReportService {
  private http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly baseUrl = `${this.baseApiUrl}/billing/reports`;

  // ==================== REPORT ENDPOINTS ====================

  /**
   * Get total invoiced amount for a date range.
   */
  getInvoicedTotal(from: Date, to: Date): Observable<InvoicedTotalResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InvoicedTotalResponse>(`${this.baseUrl}/invoiced-total`, { params });
  }

  /**
   * Get invoiced total by branch and insurer type.
   */
  getInvoicedByBranch(from: Date, to: Date): Observable<InvoicedByBranchResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InvoicedByBranchResponse>(`${this.baseUrl}/invoiced-by-branch`, { params });
  }

  /**
   * Get invoiced total by insurer.
   */
  getInvoicedByInsurer(from: Date, to: Date): Observable<InvoicedByInsurerResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InvoicedByInsurerResponse>(`${this.baseUrl}/invoiced-by-insurer`, { params });
  }

  /**
   * Get invoiced vs pending amounts.
   */
  getInvoicedVsPending(from: Date, to: Date): Observable<InvoicedVsPendingResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InvoicedVsPendingResponse>(`${this.baseUrl}/invoiced-vs-pending`, { params });
  }

  /**
   * Get invoiced amount minus costs.
   */
  getInvoicedMinusCosts(from: Date, to: Date): Observable<InvoicedMinusCostsResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InvoicedMinusCostsResponse>(`${this.baseUrl}/invoiced-minus-costs`, { params });
  }

  /**
   * Get comparative analysis between periods.
   */
  getComparativeReport(
    from: Date,
    to: Date,
    comparisonType: 'CONSECUTIVE' | 'SAME_PERIOD_LAST_YEAR'
  ): Observable<ComparativeReportResponse> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to))
      .set('comparisonType', comparisonType);
    return this.http.get<ComparativeReportResponse>(`${this.baseUrl}/comparative`, { params });
  }

  // ==================== KPI ENDPOINTS ====================

  /**
   * Get total invoiced for current month.
   */
  getCurrentMonthTotal(): Observable<MonthTotalKPI> {
    return this.http.get<MonthTotalKPI>(`${this.baseUrl}/kpis/current-month-total`);
  }

  /**
   * Get year-to-date total invoiced.
   */
  getYTDTotal(): Observable<YTDTotalKPI> {
    return this.http.get<YTDTotalKPI>(`${this.baseUrl}/kpis/ytd-total`);
  }

  /**
   * Get invoiced by insurer type.
   */
  getInvoicedByInsurerType(from: Date, to: Date): Observable<InsurerTypeKPI> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<InsurerTypeKPI>(`${this.baseUrl}/kpis/by-insurer-type`, { params });
  }

  /**
   * Get total invoiced by branch.
   */
  getTotalByBranch(from: Date, to: Date): Observable<BranchTotalKPI> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to));
    return this.http.get<BranchTotalKPI>(`${this.baseUrl}/kpis/by-branch`, { params });
  }

  /**
   * Get ratio of pending to invoiced.
   */
  getInvoicedPendingRatio(): Observable<InvoicedPendingRatioKPI> {
    return this.http.get<InvoicedPendingRatioKPI>(`${this.baseUrl}/kpis/invoiced-pending-ratio`);
  }

  /**
   * Get ratio of invoiced to costs.
   */
  getInvoicedCostsRatio(): Observable<InvoicedCostsRatioKPI> {
    return this.http.get<InvoicedCostsRatioKPI>(`${this.baseUrl}/kpis/invoiced-costs-ratio`);
  }

  /**
   * Get top insurers by invoiced amount.
   */
  getTopInsurers(from: Date, to: Date, limit: number = 5): Observable<TopInsurersKPI> {
    const params = new HttpParams()
      .set('from', this.formatDate(from))
      .set('to', this.formatDate(to))
      .set('limit', limit.toString());
    return this.http.get<TopInsurersKPI>(`${this.baseUrl}/kpis/top-insurers`, { params });
  }

  /**
   * Get month-over-month growth.
   */
  getMonthOverMonthGrowth(): Observable<MonthOverMonthGrowthKPI> {
    return this.http.get<MonthOverMonthGrowthKPI>(`${this.baseUrl}/kpis/month-over-month-growth`);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Formats a Date object to yyyy-MM-dd format.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
