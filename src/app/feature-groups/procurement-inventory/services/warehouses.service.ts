import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { WarehouseRequestDTO, WarehouseResponseDTO } from '../models/warehouses/warehouse.model';

/**
 * Warehouses service
 */
@Injectable({
  providedIn: 'root'
})
export class WarehousesService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/warehouses`;
  private http = inject(HttpClient);

  /**
   * Get all warehouses
   */
  getAllWarehouses(): Observable<WarehouseResponseDTO[]> {
    return this.http.get<WarehouseResponseDTO[]>(this.apiUrl);
  }

  /**
   * Get warehouse by id
   */
  getWarehouseById(id: string): Observable<WarehouseResponseDTO> {
    return this.http.get<WarehouseResponseDTO>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create warehouse
   */
  createWarehouse(warehouse: WarehouseRequestDTO): Observable<WarehouseResponseDTO> {
    return this.http.post<WarehouseResponseDTO>(this.apiUrl, warehouse);
  }

  /**
   * Update warehouse
   */
  updateWarehouse(id: string, warehouse: WarehouseRequestDTO): Observable<WarehouseResponseDTO> {
    return this.http.put<WarehouseResponseDTO>(`${this.apiUrl}/${id}`, warehouse);
  }

  /**
   * Deactivate warehouse
   */
  deactivateWarehouse(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}`, { isActive: false });
  }
}
