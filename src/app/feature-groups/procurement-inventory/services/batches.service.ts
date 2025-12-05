import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  RequestBatchDTO,
  ResponseBatchDTO,
  BatchUpdateDTO,
  BatchDeactivateDTO,
  CreateBatchResponseDTO,
  ResponseBatchSearchDTO,
  BatchFiltersDTO
} from '../models/batches/batches.model';

/**
 * Servicio para gestión de lotes
 */
@Injectable({
  providedIn: 'root'
})
export class BatchesService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/batches`;
  private http = inject(HttpClient);

  /**
   * Crear un nuevo lote
   */
  createBatch(batch: RequestBatchDTO): Observable<CreateBatchResponseDTO> {
    return this.http.post<CreateBatchResponseDTO>(`${this.apiUrl}/create`, batch);
  }

  /**
   * Buscar lotes con filtros y paginación
   */
  searchBatches(filters?: BatchFiltersDTO): Observable<ResponseBatchSearchDTO> {
    let params = new HttpParams();

    if (filters) {
      if (filters.supplyId !== undefined) {
        params = params.set('supply_id', filters.supplyId.toString());
      }
      if (filters.supplierId !== undefined) {
        params = params.set('supplier_id', filters.supplierId.toString());
      }
      if (filters.batchNumber) {
        params = params.set('batchNumber', filters.batchNumber);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.isActive !== undefined) {
        params = params.set('is_active', filters.isActive.toString());
      }
      if (filters.expirationDateFrom) {
        params = params.set('expiration_date_from', filters.expirationDateFrom);
      }
      if (filters.expirationDateTo) {
        params = params.set('expiration_date_to', filters.expirationDateTo);
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.size !== undefined) {
        params = params.set('size', filters.size.toString());
      }
      if (filters.sortBy) {
        params = params.set('sortBy', filters.sortBy);
      }
      if (filters.sortDirection) {
        params = params.set('sortDirection', filters.sortDirection);
      }
    }

    return this.http.get<ResponseBatchSearchDTO>(this.apiUrl, { params });
  }

  /**
   * Obtener lote por ID
   */
  getBatchById(id: number): Observable<ResponseBatchDTO> {
    return this.http.get<ResponseBatchDTO>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualizar lote
   */
  updateBatch(id: number, batch: BatchUpdateDTO): Observable<ResponseBatchDTO> {
    return this.http.put<ResponseBatchDTO>(`${this.apiUrl}/${id}`, batch);
  }

  /**
   * Desactivar lote
   */
  deactivateBatch(id: number, reason: string, userId?: number): Observable<ResponseBatchDTO> {
    const deactivateData: BatchDeactivateDTO = { reason, userId };
    return this.http.patch<ResponseBatchDTO>(`${this.apiUrl}/${id}/deactivate`, deactivateData);
  }

  /**
   * Actualizar lotes vencidos
   */
  updateExpiredBatches(): Observable<string> {
    return this.http.post(`${this.apiUrl}/update-expired`, {}, { responseType: 'text' });
  }
}
