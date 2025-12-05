import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  RequestSupplierDTO,
  ResponseSupplierDTO,
  SupplierUpdateDTO,
  SupplierDeactivateDTO,
  CreateSupplierResponseDTO,
  SupplierDetailResponseDTO,
  ResponseSupplierSearchDTO,
  SupplierFiltersDTO
} from '../models/suppliers/suppliers.model';

/**
 * Servicio para gestión de proveedores
 */
@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/suppliers`;
  private http = inject(HttpClient);

  /**
   * Crear un nuevo proveedor
   */
  createSupplier(supplier: RequestSupplierDTO): Observable<CreateSupplierResponseDTO> {
    return this.http.post<CreateSupplierResponseDTO>(this.apiUrl, supplier);
  }

  /**
   * Buscar proveedores con filtros y paginación
   * Endpoint: GET /api/v1/suppliers/all
   */
  searchSuppliers(filters?: SupplierFiltersDTO): Observable<ResponseSupplierSearchDTO> {
    let params = new HttpParams();

    if (filters) {
      // searchTerm (camelCase as per backend spec)
      if (filters.searchTerm && filters.searchTerm.trim()) {
        params = params.set('searchTerm', filters.searchTerm.trim());
      }
      // isActive (camelCase as per backend spec)
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
        // El sort debe ser el nombre del campo en snake_case (ej: company_name)
        params = params.set('sort', filters.sort);
        // Extraer direction si viene en el formato "campo,direccion"
        const sortParts = filters.sort.split(',');
        if (sortParts.length > 1) {
          params = params.set('direction', sortParts[1].toUpperCase());
          params = params.set('sort', sortParts[0]);
        } else {
          params = params.set('direction', 'ASC');
        }
      }
    }

    return this.http.get<ResponseSupplierSearchDTO>(this.apiUrl, { params });
  }

  /**
   * Obtener proveedor por ID
   */
  getSupplierById(id: number): Observable<SupplierDetailResponseDTO> {
    return this.http.get<SupplierDetailResponseDTO>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualizar proveedor
   */
  updateSupplier(id: number, supplier: SupplierUpdateDTO): Observable<SupplierDetailResponseDTO> {
    return this.http.put<SupplierDetailResponseDTO>(`${this.apiUrl}/${id}`, supplier);
  }

  /**
   * Obtener todos los proveedores activos
   */
  getActiveSuppliers(): Observable<ResponseSupplierDTO[]> {
    return this.http.get<ResponseSupplierDTO[]>(`${this.apiUrl}/actives`);
  }

  /**
   * Desactivar proveedor
   */
  deactivateSupplier(id: number, reason: string): Observable<ResponseSupplierDTO> {
    const deactivateData: SupplierDeactivateDTO = { reason };
    return this.http.patch<ResponseSupplierDTO>(`${this.apiUrl}/${id}/deactivate`, deactivateData);
  }

  /**
   * Reactivar proveedor
   */
  reactivateSupplier(id: number): Observable<ResponseSupplierDTO> {
    return this.http.patch<ResponseSupplierDTO>(`${this.apiUrl}/${id}/reactivate`, {});
  }

  /**
   * Verificar si un CUIT ya existe en el sistema
   * @param cuit CUIT a verificar (sin guiones)
   * @param excludeSupplierId ID del proveedor a excluir de la búsqueda (opcional, para edición)
   * @returns Observable<boolean> true si existe, false si no existe
   */
  existsCuit(cuit: string, excludeSupplierId?: number): Observable<boolean> {
    let params = new HttpParams().set('cuit', cuit);

    if (excludeSupplierId) {
      params = params.set('excludeId', excludeSupplierId.toString());
    }

    return this.http.get<boolean>(`${this.apiUrl}/exists-cuit`, { params });
  }

  /**
   * Exportar proveedores a Excel
   */
  exportSuppliersToExcel(filters?: SupplierFiltersDTO): Observable<Blob> {
    let params = new HttpParams();

    if (filters) {
      // searchTerm (camelCase as per backend spec)
      if (filters.searchTerm && filters.searchTerm.trim()) {
        params = params.set('searchTerm', filters.searchTerm.trim());
      }
      // isActive (camelCase as per backend spec)
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.size !== undefined) {
        params = params.set('size', filters.size.toString());
      }
      if (filters.sort) {
        params = params.set('sort', filters.sort);
      }
    }

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}
