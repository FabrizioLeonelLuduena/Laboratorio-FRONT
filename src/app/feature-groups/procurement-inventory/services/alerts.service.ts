import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { map } from 'rxjs/operators';

import {
  AlertSummaryDTO,
  CriticalStockAlertDTO,
  BatchAlertDTO,
  AlertFiltersDTO
} from '../models/alerts/alerts.model';
import {
  ExcessStockAlertDTO,
  ExcessStockAlertsResponseDTO
} from '../models/alerts/excess-stock-alerts.model';

/**
 * Service for managing inventory alerts
 * Handles critical stock, expiring batches, and expired batches alerts
 */
@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/alerts`;
  private readonly http = inject(HttpClient);

  /**
   * Get all supplies with stock below minimum threshold
   * @returns Observable with array of critical stock alerts
   */
  getCriticalStock(): Observable<CriticalStockAlertDTO[]> {
    return this.http.get<CriticalStockAlertDTO[]>(`${this.apiUrl}/critical-stock`);
  }

  /**
   * Get batches expiring in the next N days
   * @param filters Alert filters (daysAhead parameter)
   * @returns Observable with array of expiring batch alerts
   */
  getExpiringBatches(filters: AlertFiltersDTO = {}): Observable<BatchAlertDTO[]> {
    let params = new HttpParams();

    if (filters.daysAhead !== undefined) {
      params = params.set('daysAhead', filters.daysAhead.toString());
    }

    return this.http.get<BatchAlertDTO[]>(`${this.apiUrl}/expiring-batches`, { params });
  }

  /**
   * Get all expired batches
   * @returns Observable with array of expired batch alerts
   */
  getExpiredBatches(): Observable<BatchAlertDTO[]> {
    return this.http.get<BatchAlertDTO[]>(`${this.apiUrl}/expired-batches`);
  }

  /**
   * Get consolidated summary of all alerts
   * @param filters Alert filters (daysAhead parameter)
   * @returns Observable with alert summary containing counters and details
   */
  getAlertSummary(filters: AlertFiltersDTO = {}): Observable<AlertSummaryDTO> {
    let params = new HttpParams();

    if (filters.daysAhead !== undefined) {
      params = params.set('daysAhead', filters.daysAhead.toString());
    }

    return this.http.get<AlertSummaryDTO>(`${this.apiUrl}/summary`, { params });
  }

  /**
   * RF-23: Get supplies with stock exceeding maximum threshold
   * @returns Observable with array of excess stock alerts
   */
  getExcessStock(): Observable<ExcessStockAlertDTO[]> {
    return this.http.get<ExcessStockAlertsResponseDTO>(`${this.apiUrl}/excess-stock`)
      .pipe(map(response => response.alerts));
  }
}
