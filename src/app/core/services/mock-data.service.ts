import { HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError, delay } from 'rxjs';

/**
 * Mock Data Service
 * Gestiona datos mock en memoria y simula operaciones CRUD
 */
@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private mockData: Map<string, any[]> = new Map();
  private loaded = false;

  // Simula latencia de red (ms)
  private readonly NETWORK_DELAY = 300;

  /**
   * Initialize the service
   */
  constructor() {}

  /**
   * Carga los datos mock desde los archivos JSON
   * @returns Promise que se resuelve cuando los datos están cargados
   */
  async loadMockData(): Promise<void> {
    if (this.loaded) return;

    try {
      const [
        suppliers,
        supplies,
        purchaseOrders,
        categories,
        locations,
        locationTypes,
        // KPI data
        kpiTransfersByLocation,
        kpiOutputsByLocation,
        kpiAverageTransferTime,
        kpiMostDemandedSupplies,
        kpiCriticalStock,
        kpiInventoryValue,
        kpiPendingOrders,
        kpiOntimeDeliveryRate,
        kpiTopSuppliers,
        kpiTopProducts,
        kpiTopLocations,
        kpiTotalPurchaseVolume,
        kpiAverageDeliveryTime,
        kpiCreatedOrders,
        kpiReturnRate,
        kpiVolumeBySupplier,
        kpiDeliveryTimeBySupplier,
        kpiOrdersByMonth,
        kpiReturnRateBySupplier,
        // Alerts
        alertsCriticalStock,
        alertsExcessStock
      ] = await Promise.all([
        fetch('/assets/mock-data/suppliers.json').then(r => r.json()),
        fetch('/assets/mock-data/supplies.json').then(r => r.json()),
        fetch('/assets/mock-data/purchase-orders.json').then(r => r.json()),
        fetch('/assets/mock-data/categories.json').then(r => r.json()),
        fetch('/assets/mock-data/locations.json').then(r => r.json()),
        fetch('/assets/mock-data/location-types.json').then(r => r.json()),
        // KPI data
        fetch('/assets/mock-data/kpi-transfers-by-location.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-outputs-by-location.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-average-transfer-time.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-most-demanded-supplies.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-critical-stock.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-inventory-value.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-pending-orders.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-ontime-delivery-rate.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-top-suppliers.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-top-products.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-top-locations.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-total-purchase-volume.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-average-delivery-time.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-created-orders.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-return-rate.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-volume-by-supplier.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-delivery-time-by-supplier.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-orders-by-month.json').then(r => r.json()),
        fetch('/assets/mock-data/kpi-return-rate-by-supplier.json').then(r => r.json()),
        // Alerts
        fetch('/assets/mock-data/alerts-critical-stock.json').then(r => r.json()),
        fetch('/assets/mock-data/alerts-excess-stock.json').then(r => r.json())
      ]);

      this.mockData.set('suppliers', suppliers);
      this.mockData.set('supplies', supplies);
      this.mockData.set('purchase-orders', purchaseOrders);
      this.mockData.set('categories', categories);
      this.mockData.set('locations', locations);
      this.mockData.set('location-types', locationTypes);

      // Store KPI data
      this.mockData.set('kpi-transfers-by-location', kpiTransfersByLocation);
      this.mockData.set('kpi-outputs-by-location', kpiOutputsByLocation);
      this.mockData.set('kpi-average-transfer-time', kpiAverageTransferTime);
      this.mockData.set('kpi-most-demanded-supplies', kpiMostDemandedSupplies);
      this.mockData.set('kpi-critical-stock', kpiCriticalStock);
      this.mockData.set('kpi-inventory-value', kpiInventoryValue);
      this.mockData.set('kpi-pending-orders', kpiPendingOrders);
      this.mockData.set('kpi-ontime-delivery-rate', kpiOntimeDeliveryRate);
      this.mockData.set('kpi-top-suppliers', kpiTopSuppliers);
      this.mockData.set('kpi-top-products', kpiTopProducts);
      this.mockData.set('kpi-top-locations', kpiTopLocations);
      this.mockData.set('kpi-total-purchase-volume', kpiTotalPurchaseVolume);
      this.mockData.set('kpi-average-delivery-time', kpiAverageDeliveryTime);
      this.mockData.set('kpi-created-orders', kpiCreatedOrders);
      this.mockData.set('kpi-return-rate', kpiReturnRate);
      this.mockData.set('kpi-volume-by-supplier', kpiVolumeBySupplier);
      this.mockData.set('kpi-delivery-time-by-supplier', kpiDeliveryTimeBySupplier);
      this.mockData.set('kpi-orders-by-month', kpiOrdersByMonth);
      this.mockData.set('kpi-return-rate-by-supplier', kpiReturnRateBySupplier);

      // Store alerts data
      this.mockData.set('alerts-critical-stock', alertsCriticalStock);
      this.mockData.set('alerts-excess-stock', alertsExcessStock);

      this.loaded = true;
      console.log('📊 Mock data loaded:', {
        suppliers: this.mockData.get('suppliers')?.length,
        supplies: this.mockData.get('supplies')?.length,
        purchaseOrders: this.mockData.get('purchase-orders')?.length,
        categories: this.mockData.get('categories')?.length,
        locations: this.mockData.get('locations')?.length,
        locationTypes: this.mockData.get('location-types')?.length,
        kpiDatasets: Array.from(this.mockData.keys()).filter(k => k.startsWith('kpi-')).length
      });
    } catch (error) {
      console.error('❌ Error loading mock data files:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los registros de una entidad
   */
  getAll<T>(entity: string): Observable<HttpResponse<T[]>> {
    const data = this.mockData.get(entity) || [];
    
    return of(new HttpResponse({
      status: 200,
      body: data as T[]
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Obtiene todos los registros activos de una entidad (sin paginación)
   */
  getAllActive<T>(entity: string): Observable<HttpResponse<T[]>> {
    const data = this.mockData.get(entity) || [];
    const activeData = data.filter((item: any) => item.isActive !== false);
    
    return of(new HttpResponse({
      status: 200,
      body: activeData as T[]
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Obtiene un registro por ID
   */
  getById<T>(entity: string, id: number): Observable<HttpResponse<T>> {
    const data = this.mockData.get(entity) || [];
    const item = data.find((d: any) => d.id === id);

    if (!item) {
      return throwError(() => new HttpErrorResponse({
        error: { message: `${entity} with id ${id} not found` },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.NETWORK_DELAY));
    }

    return of(new HttpResponse({
      status: 200,
      body: item as T
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Búsqueda paginada con filtros
   */
  search<T>(
    entity: string,
    page: number = 0,
    size: number = 10,
    filters?: any
  ): Observable<HttpResponse<{
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }>> {
    let data = this.mockData.get(entity) || [];

    // Aplicar filtros si existen
    if (filters) {
      data = this.applyFilters(data, filters);
    }

    // Paginación
    const start = page * size;
    const end = start + size;
    const paginatedData = data.slice(start, end);

    return of(new HttpResponse({
      status: 200,
      body: {
        content: paginatedData as T[],
        totalElements: data.length,
        totalPages: Math.ceil(data.length / size),
        size: size,
        number: page
      }
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Crea un nuevo registro
   */
  create<T>(entity: string, item: Partial<T>): Observable<HttpResponse<T>> {
    const data = this.mockData.get(entity) || [];
    const newId = Math.max(...data.map((d: any) => d.id), 0) + 1;
    
    const newItem = {
      ...item,
      id: newId,
      createdDatetime: new Date().toISOString(),
      lastUpdatedDatetime: new Date().toISOString(),
      isActive: true
    } as T;

    data.push(newItem);
    this.mockData.set(entity, data);

    return of(new HttpResponse({
      status: 201,
      body: newItem
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Actualiza un registro existente
   */
  update<T extends { id: number }>(
    entity: string,
    id: number,
    updates: Partial<T>
  ): Observable<HttpResponse<T>> {
    const data = this.mockData.get(entity) || [];
    const index = data.findIndex((d: any) => d.id === id);

    if (index === -1) {
      return throwError(() => new HttpErrorResponse({
        error: { message: `${entity} with id ${id} not found` },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.NETWORK_DELAY));
    }

    const updatedItem = {
      ...data[index],
      ...updates,
      id: id, // Preservar ID
      lastUpdatedDatetime: new Date().toISOString()
    } as T;

    data[index] = updatedItem;
    this.mockData.set(entity, data);

    return of(new HttpResponse({
      status: 200,
      body: updatedItem
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Elimina un registro (soft delete)
   */
  delete(entity: string, id: number): Observable<HttpResponse<void>> {
    const data = this.mockData.get(entity) || [];
    const index = data.findIndex((d: any) => d.id === id);

    if (index === -1) {
      return throwError(() => new HttpErrorResponse({
        error: { message: `${entity} with id ${id} not found` },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.NETWORK_DELAY));
    }

    // Soft delete
    data[index].isActive = false;
    data[index].lastUpdatedDatetime = new Date().toISOString();
    this.mockData.set(entity, data);

    return of(new HttpResponse({
      status: 204,
      body: undefined
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Aplica filtros a los datos
   */
  private applyFilters(data: any[], filters: any): any[] {
    return data.filter(item => {
      for (const key in filters) {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          continue;
        }

        const itemValue = item[key];
        const filterValue = filters[key];

        // Búsqueda por texto (case insensitive)
        if (typeof filterValue === 'string') {
          if (typeof itemValue === 'string' && 
              !itemValue.toLowerCase().includes(filterValue.toLowerCase())) {
            return false;
          }
        }
        // Comparación exacta para otros tipos
        else if (itemValue !== filterValue) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Limpia los datos mock (útil para testing)
   */
  clearMockData(): void {
    this.mockData.clear();
    this.loaded = false;
  }

  /**
   * Verifica si los datos están cargados
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Obtiene datos KPI por tipo
   * @param kpiType Tipo de KPI (e.g., 'transfers-by-location', 'average-delivery-time')
   * @returns Observable con la respuesta KPI
   */
  getKpiData<T>(kpiType: string): Observable<HttpResponse<T>> {
    const kpiKey = `kpi-${kpiType}`;
    const data = this.mockData.get(kpiKey);

    if (!data) {
      return throwError(() => new HttpErrorResponse({
        error: { message: `KPI data for ${kpiType} not found` },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.NETWORK_DELAY));
    }

    return of(new HttpResponse({
      status: 200,
      body: data as T
    })).pipe(delay(this.NETWORK_DELAY));
  }

  /**
   * Obtiene datos por clave directa (para casos especiales como alertas)
   * @param key Clave exacta en el Map
   * @returns Los datos o undefined si no existen
   */
  getRawData(key: string): any {
    return this.mockData.get(key);
  }
}
