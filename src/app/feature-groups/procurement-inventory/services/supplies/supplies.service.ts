import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  CreateSupplyRequestDTO,
  CreateSupplyResponseDTO,
  SupplyDetailResponseDTO,
  SupplyFiltersDTO,
  SupplySearchResponseDTO,
  SupplyUpdateDTO
} from '../../models/supplies/supplies.model';

/**
 * Service layer for supply and supply type entity operations
 * Handles HTTP communication with backend REST API
 *
 * Architecture notes:
 * - Uses Angular HttpClient for REST communication
 * - Proxy rewrites /api/api/* to /api/* (removes first /api segment)
 * - All responses follow Spring Boot Page<T> structure for pagination
 * - Error handling delegated to consuming components
 */
@Injectable({
  providedIn: 'root'
})
export class SuppliesService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/supplies`;
  private http = inject(HttpClient);

  // ==============================================
  // SUPPLY METHODS
  // ==============================================

  /**
   * Creates a new supply entity via POST request
   * @param supply - Supply data transfer object
   * @returns Observable with creation response including created entity
   * @throws HttpErrorResponse on validation or server errors (400, 403, 404, 409, 500)
   */
  createSupply(supply: CreateSupplyRequestDTO): Observable<CreateSupplyResponseDTO> {
    return this.http.post<CreateSupplyResponseDTO>(this.apiUrl, supply);
  }

  /**
   * Retrieves paginated supply list with optional filtering
   * @param filters - Optional query parameters for filtering and pagination
   * @returns Observable with Spring Boot Page<SupplyDetailResponseDTO>
   */
  searchSupplies(filters?: SupplyFiltersDTO): Observable<SupplySearchResponseDTO> {
    let params = new HttpParams();

    if (filters) {
      if (filters.name) {
        params = params.set('name', filters.name);
      }
      if (filters.categoryId !== undefined) {
        params = params.set('categoryId', filters.categoryId.toString());
      }
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

    return this.http.get<SupplySearchResponseDTO>(this.apiUrl, { params });
  }

  /**
   * Retrieves a single supply entity by its unique identifier
   * @param id - Supply entity primary key
   * @returns Observable with supply detail data
   * @throws HttpErrorResponse 404 if supply not found
   */
  getSupplyById(id: number): Observable<SupplyDetailResponseDTO> {
    return this.http.get<SupplyDetailResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // ==============================================
  // SUPPLY STATUS METHODS
  // ==============================================

  /**
   * Deactivates a supply entity by ID
   * @param id - Supply entity primary key
   * @returns Observable with updated supply entity
   * @throws HttpErrorResponse on validation or server errors (400, 403, 404, 500)
   */
  deactivateSupply(id: number): Observable<SupplyDetailResponseDTO> {
    return this.http.patch<SupplyDetailResponseDTO>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  /**
   * Reactivates a supply entity by ID
   * @param id - Supply entity primary key
   * @returns Observable with updated supply entity
   * @throws HttpErrorResponse on validation or server errors (400, 403, 404, 500)
   */
  reactivateSupply(id: number): Observable<SupplyDetailResponseDTO> {
    return this.http.patch<SupplyDetailResponseDTO>(`${this.apiUrl}/${id}/reactivate`, {});
  }


  /**
   * Update a supply by ID
   * @param id
   * @param supply
   * @returns Observable with updated supply
   * @throws HttpErrorResponse on validation or server errors (400, 403, 404, 500)
   */
  updateSupply(id: number, supply: SupplyUpdateDTO): Observable<SupplyDetailResponseDTO> {
    return this.http.put<SupplyDetailResponseDTO>(`${this.apiUrl}/${id}`, supply);
  }

  /**
   * Export supplies to Excel
   * @param filters - Filters to apply to the export
   * @returns Observable that completes when the supplies are exported
   */
  exportSuppliesToExcel(filters: SupplyFiltersDTO): Observable<Blob> {
    let params = new HttpParams();

    if (filters.name) params = params.set('name', filters.name);
    if (filters.categoryId !== undefined) params = params.set('categoryId', filters.categoryId.toString());
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
  }
}
