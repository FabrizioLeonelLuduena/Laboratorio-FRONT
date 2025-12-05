import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  RequestLocationDTO,
  ResponseLocationDTO,
  LocationUpdateDTO,
  LocationFiltersDTO,
  LocationTreeDTO,
  CanBeParentDTO,
  LocationDeactivateDTO,
  LocationTypeDTO,
  PageResponse,
  CreateBranchLocationDTO
} from '../models/locations/locations.model';

/**
 * Service layer for location entity operations
 * Handles HTTP communication with backend REST API
 *
 * Architecture notes:
 * - Uses Angular HttpClient for REST communication
 * - Proxy rewrites /api/api/* to /api/* (removes first /api segment)
 * - All responses follow Spring Boot Page<T> structure for pagination
 * - Error handling delegated to consuming components
 * - Implements in-memory cache for valid parents by location type
 */
@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  private readonly API_URL = `${environment.apiUrl}/v1/stock/locations`;
  private http = inject(HttpClient);

  /**
   * In-memory cache for valid parents by location type
   * Key: locationType (e.g., 'FREEZER')
   * Value: ResponseLocationDTO[]
   */
  private validParentsCache = new Map<string, ResponseLocationDTO[]>();

  /**
   * Create a new location
   * Clears valid parents cache after successful creation
   */
  createLocation(location: RequestLocationDTO): Observable<ResponseLocationDTO> {
    return this.http.post<ResponseLocationDTO>(`${this.API_URL}`, location).pipe(
      tap(() => this.clearValidParentsCache())
    );
  }

  /**
   * Get locations with filters and pagination
   */
  getAllLocations(filters: LocationFiltersDTO): Observable<PageResponse<ResponseLocationDTO>> {
    let params = new HttpParams();

    if (filters.name) params = params.set('name', filters.name);
    if (filters.locationType) params = params.set('locationType', filters.locationType);
    if (filters.parentId) params = params.set('parentId', filters.parentId.toString());
    if (filters.term) params = params.set('term', filters.term);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http.get<PageResponse<ResponseLocationDTO>>(`${this.API_URL}`, { params });
  }

  /**
   * Get a location by ID
   */
  getLocationById(id: number): Observable<ResponseLocationDTO> {
    return this.http.get<ResponseLocationDTO>(`${this.API_URL}/${id}`);
  }

  /**
   * Update a location
   * Clears valid parents cache after successful update
   */
  updateLocation(id: number, updateData: LocationUpdateDTO): Observable<ResponseLocationDTO> {
    return this.http.put<ResponseLocationDTO>(`${this.API_URL}/${id}`, updateData).pipe(
      tap(() => this.clearValidParentsCache())
    );
  }

  /**
   * Deactivate a location (logical deletion)
   * Clears valid parents cache after successful deactivation
   */
  deactivateLocation(id: number, deactivateData: LocationDeactivateDTO): Observable<ResponseLocationDTO> {
    return this.http.patch<ResponseLocationDTO>(`${this.API_URL}/${id}/deactivate`, deactivateData).pipe(
      tap(() => this.clearValidParentsCache())
    );
  }

  /**
   * Get all active locations
   */
  getActiveLocations(): Observable<ResponseLocationDTO[]> {
    return this.http.get<ResponseLocationDTO[]>(`${this.API_URL}/actives`);
  }

  /**
   * Get location types
   */
  getLocationTypes(): Observable<LocationTypeDTO[]> {
    return this.http.get<LocationTypeDTO[]>(`${this.API_URL}/types`);
  }

  /**
   * Get location tree
   */
  getLocationTree(includeInactive: boolean = false): Observable<LocationTreeDTO[]> {
    const params = new HttpParams().set('includeInactive', includeInactive.toString());
    return this.http.get<LocationTreeDTO[]>(`${this.API_URL}/tree`, { params });
  }

  /**
   * Validate if a location can be a parent
   */
  validateCanBeParent(id: number): Observable<CanBeParentDTO> {
    return this.http.get<CanBeParentDTO>(`${this.API_URL}/can-be-parent/${id}`);
  }

  /**
   * Get valid parent locations for a given location type
   * Implements in-memory cache to avoid redundant API calls
   * Cache is cleared when mutations occur (create/update/deactivate/reactivate)
   *
   * @param locationType - The location type code (e.g., 'FREEZER', 'SHELF')
   * @param forceRefresh - If true, bypasses cache and fetches from API
   * @returns Observable with array of valid parent locations
   */
  getValidParentsForType(locationType: string, forceRefresh = false): Observable<ResponseLocationDTO[]> {
    
    if (!forceRefresh && this.validParentsCache.has(locationType)) {
      const cached = this.validParentsCache.get(locationType)!;
      return of(cached);
    }

    const params = new HttpParams().set('locationType', locationType);
    const url = `${this.API_URL}/valid-parents`;
    
    return this.http.get<ResponseLocationDTO[]>(url, { params }).pipe(
      tap(parents => {
        this.validParentsCache.set(locationType, parents);
      })
    );
  }

  /**
   * Clear valid parents cache
   * Called after any location mutation to ensure fresh data on next request
   */
  private clearValidParentsCache(): void {
    this.validParentsCache.clear();
  }

  /**
   * Get only branch locations from the backend
   * Used to replace the previous call to the branches microservice
   * Endpoint: GET /api/v1/stock/locations/branch
   *
   * NOTE: This endpoint returns locations of type BRANCH only.
   * Previously this data came from a separate branches microservice.
   */
  getBranchLocations(): Observable<ResponseLocationDTO[]> {
    return this.http.get<ResponseLocationDTO[]>(`${this.API_URL}/branch`);
  }

  /**
   * Create a branch location automatically when a new branch is created
   * Endpoint: POST /api/v1/stock/locations/branch
   *
   * This method is called after successful branch creation to register
   * the branch in the locations microservice for inventory management.
   *
   * @param branchId - The ID of the newly created branch
   * @param name - The name/code of the branch
   * @returns Observable that completes when the location is created
   */
  createBranchLocation(branchId: number, name: string): Observable<ResponseLocationDTO> {
    const payload: CreateBranchLocationDTO = {
      branchId,
      name
    };
    return this.http.post<ResponseLocationDTO>(`${this.API_URL}/branch`, payload);
  }

  /**
   * Get child locations of a specific location
   * Endpoint: GET /api/v1/stock/locations/{id}/children
   *
   * This method is used to validate location deactivation.
   * If a location has children, the user must be warned that deactivating
   * the parent will also deactivate all child locations.
   *
   * @param locationId - The ID of the parent location
   * @returns Observable with array of child locations
   */
  getChildLocations(locationId: number): Observable<ResponseLocationDTO[]> {
    return this.http.get<ResponseLocationDTO[]>(`${this.API_URL}/${locationId}/children`);
  }

  /**
   * Get inactive parent locations of a specific location
   * Endpoint: GET /api/v1/stock/locations/{id}/parents
   *
   * This method is used to validate location reactivation.
   * If a location has inactive parents, the user must be warned that reactivating
   * the location will also reactivate all inactive parent locations.
   *
   * @param locationId - The ID of the location to reactivate
   * @returns Observable with array of inactive parent locations
   */
  getParentLocations(locationId: number): Observable<ResponseLocationDTO[]> {
    return this.http.get<ResponseLocationDTO[]>(`${this.API_URL}/${locationId}/parents`);
  }

  /**
   * Reactivate a location (and let backend handle reactivation of inactive parents)
   * Endpoint: PATCH /api/v1/stock/locations/{id}/reactivate
   * Clears valid parents cache after successful reactivation
   *
   * This method mirrors `deactivateLocation` but triggers the reactivation flow
   * on the backend which may include reactivating parent locations.
   *
   * @param id - Location id to reactivate
   * @returns Observable that completes when the location is reactivated
   */
  reactivateLocation(id: number): Observable<ResponseLocationDTO> {
    return this.http.patch<ResponseLocationDTO>(`${this.API_URL}/${id}/reactivate`, {}).pipe(
      tap(() => this.clearValidParentsCache())
    );
  }

  /**
   * Export locations to Excel
   * Endpoint: GET /api/v1/stock/locations/export
   * @param filters - Filters to apply to the export
   * @returns Observable that completes when the locations are exported
   */
  exportLocationsToExcel(filters: LocationFiltersDTO): Observable<Blob> {
    let params = new HttpParams();

    if (filters.name) params = params.set('name', filters.name);
    if (filters.locationType) params = params.set('locationType', filters.locationType);
    if (filters.parentId) params = params.set('parentId', filters.parentId.toString());
    if (filters.term) params = params.set('term', filters.term);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http.get(`${this.API_URL}/export`, { params, responseType: 'blob' });
  }
}
