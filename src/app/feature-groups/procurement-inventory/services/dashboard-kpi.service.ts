import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { KpiDateRangeParams, KpiResponseDTO } from '../models/kpi/kpi.model';

/**
 * Service for dashboard KPI operations
 * Handles HTTP communication with backend KPI REST API endpoints
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardKpiService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/kpi`;
  private readonly ordersApiUrl = `${environment.apiUrl}/v1/stock/orders`;
  private readonly http = inject(HttpClient);

  /**
   * Helper method to build HTTP params, only adding non-empty values
   */
  private buildHttpParams(startDate: string, endDate: string): HttpParams {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return params;
  }

  /**
   * Get count of transfers grouped by location
   * @param params Date range and optional filters
   * @returns Observable with transfer counts by location
   */
  getTransfersByLocation(params: KpiDateRangeParams): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }
    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }
    if (params.supplyId !== undefined) {
      httpParams = httpParams.set('supplyId', params.supplyId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/transfers/by-location`, { params: httpParams });
  }

  /**
   * Get total quantity of outputs grouped by location
   * @param params Date range and optional filters
   * @returns Observable with output quantities by location
   */
  getOutputsByLocation(params: KpiDateRangeParams): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }
    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }
    if (params.supplyId !== undefined) {
      httpParams = httpParams.set('supplyId', params.supplyId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/supplies/outputs-by-location`, { params: httpParams });
  }

  /**
   * Get average time for internal transfer operations
   * @param params Date range parameters
   * @returns Observable with average transfer times
   */
  getAverageTransferTime(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/transfers/average-time`, { params: httpParams });
  }

  /**
   * Get top 5 most demanded supplies based on consumption
   * @param params Date range and optional location filter
   * @returns Observable with top 5 most demanded supplies
   */
  getMostDemandedSupplies(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'locationId' | 'supplierId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }
    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/supplies/most-demanded`, { params: httpParams });
  }

  /**
   * Get total count of supplies with critical stock levels
   * @param params Date range and optional filters
   * @returns Observable with single value response
   */
  getCriticalStockTotal(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'locationId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/stock/critical-total`, { params: httpParams });
  }

  /**
   * Get total inventory value across all locations
   * @param params Date range and optional filters
   * @returns Observable with single value response in currency
   */
  getInventoryValue(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'locationId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/inventory/total-value`, { params: httpParams });
  }

  /**
   * Get count of pending purchase orders
   * @param params Date range and optional filters
   * @returns Observable with single value response
   */
  getPendingOrders(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'supplierId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/purchase-orders/pending`, { params: httpParams });
  }

  /**
   * Get percentage of deliveries completed on time
   * @param params Date range and optional filters
   * @returns Observable with single value response (percentage)
   */
  getOnTimeDeliveryRate(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'supplierId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/deliveries/on-time-rate`, { params: httpParams });
  }

  /**
   * Get top 5 most active suppliers by transaction volume
   * @param params Date range and optional filters
   * @returns Observable with supplier rankings
   */
  getTopSuppliers(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/suppliers/top-active`, { params: httpParams });
  }

  /**
   * Get top 5 most moved products by total quantity
   * @param params Date range and optional filters
   * @returns Observable with product rankings
   */
  getTopProducts(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'locationId' | 'supplierId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.locationId !== undefined) {
      httpParams = httpParams.set('locationId', params.locationId.toString());
    }
    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/supplies/top-moved`, { params: httpParams });
  }

  /**
   * Get top 5 most active locations by movement count
   * @param params Date range and optional filters
   * @returns Observable with location rankings
   */
  getTopLocations(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/locations/top-active`, { params: httpParams });
  }

  // ========================================
  // Purchase Orders KPIs (RF-01 to RF-08)
  // ========================================

  /**
   * RF-01: Get total volume of purchase orders
   * @param params Date range parameters
   * @returns Observable with total volume
   */
  getTotalPurchaseVolume(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/total-volume`, { params: httpParams });
  }

  /**
   * RF-02: Get average delivery time for purchase orders
   * @param params Date range parameters
   * @returns Observable with average delivery time in days
   */
  getAverageDeliveryTime(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/average-delivery-time`, { params: httpParams });
  }

  /**
   * RF-03: Get count of created purchase orders
   * @param params Date range parameters
   * @returns Observable with count of created orders
   */
  getCreatedOrdersCount(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/created-count`, { params: httpParams });
  }

  /**
   * RF-04: Get return rate for purchase orders
   * @param params Date range parameters
   * @returns Observable with return rate percentage
   */
  getReturnRate(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/return-rate`, { params: httpParams });
  }

  /**
   * RF-05: Get purchase volume by supplier
   * @param params Date range parameters
   * @param limit Maximum number of results (default: 10)
   * @returns Observable with purchase volume by supplier
   */
  getVolumeBySupplier(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>, limit: number = 10): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate)
      .set('limit', limit.toString());

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/volume-by-supplier`, { params: httpParams });
  }

  /**
   * RF-06: Get delivery time by supplier
   * @param params Date range and optional supplier filter
   * @returns Observable with average delivery time by supplier
   */
  getDeliveryTimeBySupplier(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate' | 'supplierId'>): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate);

    if (params.supplierId !== undefined) {
      httpParams = httpParams.set('supplierId', params.supplierId.toString());
    }

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/suppliers/average-delivery-time`, { params: httpParams });
  }

  /**
   * RF-07: Get purchase orders grouped by month
   * @param params Date range parameters
   * @returns Observable with orders count by month (Spanish names)
   */
  getOrdersByMonth(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>): Observable<KpiResponseDTO> {
    const httpParams = this.buildHttpParams(params.startDate, params.endDate);

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/per-month`, { params: httpParams });
  }

  /**
   * RF-08: Get return rate by supplier
   * @param params Date range parameters
   * @param limit Maximum number of results (default: 10)
   * @returns Observable with return rate percentage by supplier
   */
  getReturnRateBySupplier(params: Pick<KpiDateRangeParams, 'startDate' | 'endDate'>, limit: number = 10): Observable<KpiResponseDTO> {
    let httpParams = this.buildHttpParams(params.startDate, params.endDate)
      .set('limit', limit.toString());

    return this.http.get<KpiResponseDTO>(`${this.apiUrl}/orders/return-rate-by-supplier`, { params: httpParams });
  }
}

