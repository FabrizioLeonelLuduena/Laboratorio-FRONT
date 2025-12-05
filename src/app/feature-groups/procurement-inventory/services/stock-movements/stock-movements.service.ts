import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  StockMovementRespondeDTO,
  StockMovementFiltersDTO,
  RequestStockMovementDTO,
  ResponseStockMovementDTO
} from '../../models/stock-movements/stockMovements.model';
import { ResponseSupplierItemDTO } from '../../models/supplier-items/supplier-items.model';

/**
 * Service to manage Stock Movements
 */
@Injectable({
  providedIn: 'root'
})
export class StockMovementsService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/stock-movements`;
  private readonly http = inject(HttpClient);

  /**
   * Obtiene Movimientos de stock con filtros
   * @param filters Filtros de búsqueda
   * @returns Observable con la respuesta paginada de Movimientos de stock
   */
  getStockMovements(filters: StockMovementFiltersDTO = {}): Observable<{
    content: StockMovementRespondeDTO[];
    total_elements: number;  // snake_case del backend
    total_pages: number;     // snake_case del backend
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> {
    const params: any = {
      page: (filters.page || 0).toString(),
      size: (filters.size || 10).toString()
    };

    // Agregar parámetro de búsqueda si está presente
    if (filters.searchTerm) {
      params.searchTerm = filters.searchTerm;
    }

    // Agregar parámetro de tipo de movimiento si está presente
    if (filters.movementType) {
      params.movementType = filters.movementType;
    }

    // Agregar parámetro de sorting si está presente y mapear el campo
    if (filters.sort) {
      const [fieldName, sortOrder] = filters.sort.split(',');
      const backendFieldName = this.mapFieldNameToBackend(fieldName);
      params.sort = `${backendFieldName},${sortOrder}`;
    }

    return this.http.get<{
      content: StockMovementRespondeDTO[];
      total_elements: number;
      total_pages: number;
      size: number;
      number: number;
      first: boolean;
      last: boolean;
      empty: boolean;
    }>(this.apiUrl, { params });
  }

  /**
   * Crear una compra de stock (ingreso)
   * @param request Datos de la compra
   * @returns Observable con la respuesta del movimiento creado
   */
  registryPurchase(request: RequestStockMovementDTO): Observable<ResponseStockMovementDTO> {
    return this.http.post<ResponseStockMovementDTO>(`${this.apiUrl}/purchase`, request);
  }

  /**
   * Crear un ajuste de inventario
   * @param request Datos del ajuste
   * @returns Observable con la respuesta del movimiento creado
   */
  createAdjustment(request: RequestStockMovementDTO): Observable<ResponseStockMovementDTO> {
    return this.http.post<ResponseStockMovementDTO>(`${this.apiUrl}/adjustment`, request);
  }

  /**
   * Crear una transferencia entre ubicaciones
   * @param request Datos de la transferencia
   * @returns Observable con la respuesta del movimiento creado
   */
  createTransfer(request: RequestStockMovementDTO): Observable<ResponseStockMovementDTO> {
    return this.http.post<ResponseStockMovementDTO>(`${this.apiUrl}/transfer`, request);
  }

  /**
   * Crear una devolución a proveedor
   * @param request Datos de la devolución
   * @returns Observable con la respuesta del movimiento creado
   */
  createReturn(request: RequestStockMovementDTO): Observable<ResponseStockMovementDTO> {
    return this.http.post<ResponseStockMovementDTO>(`${this.apiUrl}/return`, request);
  }

  /**
   * Obtener todos los supplierItems
   * @returns Observable con la lista de supplierItems
   */
  getSupplierItems(): Observable<ResponseSupplierItemDTO[]> {
    return this.http.get<ResponseSupplierItemDTO[]>(`${environment.apiUrl}/v1/stock/supplier-items`);
  }

  /**
   * Obtener un movimiento de stock por ID
   * @param id ID del movimiento
   * @returns Observable con los datos del movimiento
   */
  getStockMovementById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualizar un movimiento de stock
   * @param id ID del movimiento
   * @param data Datos a actualizar (cantidad, lote, fecha de vencimiento, notas)
   * @returns Observable con la respuesta del movimiento actualizado
   */
  updateStockMovement(id: number, data: {
    quantity?: number;
    batchNumber?: string;
    expirationDate?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Exportar movimientos de stock a Excel
   * @param filters - Filters to apply to the export
   * @returns Observable that completes when the stock movements are exported
   */
  exportStockMovementsToExcel(filters: StockMovementFiltersDTO): Observable<Blob> {
    let params = new HttpParams();
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    if (filters.movementType) params = params.set('movementType', filters.movementType);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
  }

  /**
   * Mapear nombres de campos del frontend al backend
   * @param fieldName Nombre del campo en el frontend
   * @returns Nombre del campo para el backend
   */
  private mapFieldNameToBackend(fieldName: string): string {
    const fieldMapping: Record<string, string> = {
      'supply_name': 'supply.name',
      'batch_code': 'batch.batchCode',
      'origin_name': 'originLocation.name',
      'destination_name': 'destinationLocation.name',
      'movement_type': 'movementType',
      'movement_date': 'movementDate',
      'responsible_user': 'responsibleUser',
      'creation_date': 'createdDatetime',
      'expiration_date': 'batch.expirationDate'
    };

    return fieldMapping[fieldName] || fieldName;
  }
}
