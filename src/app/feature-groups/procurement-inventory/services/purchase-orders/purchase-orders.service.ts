import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import {
  CreatePurchaseOrderResponseDTO,
  PurchaseOrderDeactivateDTO,
  PurchaseOrderFiltersDTO,
  RequestPurchaseOrderDTO,
  ResponsePurchaseOrderDTO
} from '../../models/purchase-orders/purchase-orders.models';

/**
 * Service for purchase order management
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/stock/purchase-orders';

  /**
   * Create a new purchase order
   * @param dto - Data of the purchase order to create
   * @returns Observable with the creation response
   */
  create(dto: RequestPurchaseOrderDTO) {
    return this.http.post<CreatePurchaseOrderResponseDTO>(`${this.baseUrl}`, dto);
  }

  /**
   * Search purchase orders with applied filters
   * @param filters - Search filters for purchase orders
   * @returns Observable with the results page of purchase orders
   */
  search(filters?: PurchaseOrderFiltersDTO) {
    let params = new HttpParams();

    if (filters) {
      // searchTerm (camelCase according to backend spec)
      if (filters.searchTerm && filters.searchTerm.trim()) {
        params = params.set('searchTerm', filters.searchTerm.trim());
      }
      // state
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      // isActive (camelCase según spec del backend)
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
      // Paginación
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.size !== undefined) {
        params = params.set('size', filters.size.toString());
      }
      // Sort y direction separados (según spec del backend)
      if (filters.sort) {
        // Extraer direction si viene en el formato "campo,direccion"
        const sortParts = filters.sort.split(',');
        if (sortParts.length > 1) {
          params = params.set('sort', sortParts[0]);
          params = params.set('direction', sortParts[1].toUpperCase());
        } else {
          params = params.set('sort', filters.sort);
          params = params.set('direction', 'DESC');
        }
      }

      // Si no hay sort definido, usar orderDate por defecto
      if (!params.has('sort')) {
        params = params.set('sort', 'orderDate');
        params = params.set('direction', 'DESC');
      }
    }
    return this.http.get<ResponsePurchaseOrderDTO>(this.baseUrl, { params });
  }

  /**
   * Get a purchase order by its ID
   * @param id - Purchase order ID
   * @returns Observable with the purchase order data
   */
  getById(id: number) {
    return this.http.get<ResponsePurchaseOrderDTO>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update an existing purchase order
   * @param id - Purchase order ID to update
   * @param dto - Updated purchase order data (already in snake_case)
   * @returns Observable with the updated purchase order
   *
   * NOTA: Este método envía el DTO tal cual sin conversión de case
   */
  update(id: number, dto: any) {
    // Enviar el DTO directamente sin que el interceptor lo modifique
    return this.http.put<ResponsePurchaseOrderDTO>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Deactivate a purchase order (logical deletion)
   * VALIDATION: Purchase orders cannot be deactivated in state PENDING or SENT
   * @param id - Purchase order ID to deactivate
   * @param reason - Deactivation reason (required)
   * @returns Observable with the server response
   */
  deactivate(id: number, reason: string) {
    const deactivateData: PurchaseOrderDeactivateDTO = { reason };
    return this.http.patch<ResponsePurchaseOrderDTO>(`${this.baseUrl}/${id}/deactivate`, deactivateData);
  }

  /**
   * Reactivate a previously deactivated purchase order
   * @param id - Purchase order ID to reactivate
   * @returns Observable with the server response
   */
  reactivate(id: number) {
    return this.http.patch<ResponsePurchaseOrderDTO>(`${this.baseUrl}/${id}/reactivate`, {});
  }

  /**
   * Exportar pedidos de compra a Excel
   * @param filters - Filters to apply to the export
   * @returns Observable that completes when the purchase orders are exported
   */
  exportPurchaseOrdersToExcel(filters: PurchaseOrderFiltersDTO): Observable<Blob> {
    let params = new HttpParams();
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get(`${this.baseUrl}/export`, { params, responseType: 'blob' });
  }

}
