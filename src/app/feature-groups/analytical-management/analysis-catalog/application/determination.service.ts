import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, switchMap, throwError, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { Determination } from '../domain/determination.model';
import { DeterminationDTO } from '../infrastructure/dto/determination.dto';
import { DeterminationMapper } from '../infrastructure/mappers/determination.mapper';

import { AnalysisService } from './analysis.service';

/**
 * Application service for handling Determination operations.
 * 
 * GET operations use the dedicated /api/v1/determinations endpoint.
 * PUT/PATCH/DELETE operations use dedicated endpoints when available.
 */
@Injectable({
  providedIn: 'root'
})
export class DeterminationService {
  private http = inject(HttpClient);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;
  
  /** Cache for determinations */
  private determinationsCache$?: Observable<Determination[]>;

  /**
   * Gets the current user ID from the authentication service.
   * @returns {number} The current user ID
   * @throws {Error} If no user is authenticated
   */
  private getCurrentUserId(): number {
    const user = this.authService.getUser();
    if (!user?.id) {
      throw new Error('No authenticated user found');
    }
    return user.id;
  }

  /**
   * Builds common headers for backend requests.
   * Includes 'X-User-Id', and optionally 'Authorization' and 'X-User-Roles'.
   */
  private buildHeaders(userId: number): HttpHeaders {
    let headers = new HttpHeaders({ 'X-User-Id': String(userId) });

    const token = this.authService.getToken();
    const roles = this.authService.getUserRoles();

    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (Array.isArray(roles) && roles.length) {
      headers = headers.set('X-User-Roles', roles.join(','));
    }
    return headers;
  }

  /**
   * Retrieves all determinations with full details.
   * Backend: GET /api/v1/determinations
   * @returns {Observable<Determination[]>} An observable that emits an array of determinations.
   * @example
   * determinationService.getDeterminations().subscribe(dets => {
   *   // Process determinations
   * });
   */
  getDeterminations(): Observable<Determination[]> {
    if (!this.determinationsCache$) {
      const userId = this.getCurrentUserId();
      const headers = this.buildHeaders(userId);

      this.determinationsCache$ = this.http
        .get<DeterminationDTO[]>(`${this.apiBaseUrl}/determinations`, { headers })
        .pipe(
          map(dtos => dtos.map(DeterminationMapper.fromDTO)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.determinationsCache$;
  }

  /**
   * Invalidates the determinations cache to force fresh data on next request.
   * Call this after any mutation (PUT, PATCH, DELETE).
   */
  invalidateCache(): void {
    this.determinationsCache$ = undefined;
  }

  /**
   * Force refresh determinations data (invalidate cache and fetch fresh data).
   * @returns {Observable<Determination[]>} Fresh determinations data
   */
  refreshDeterminations(): Observable<Determination[]> {
    this.invalidateCache();
    return this.getDeterminations();
  }

  /**
   * Retrieves a single determination by ID.
   * Delegates to AnalysisService
   * @param {number} id - The determination ID
   * @returns {Observable<Determination>} An observable that emits the determination in domain format.
   * @example
   * determinationService.getDeterminationById(1).subscribe(det => {
   *   // Process determination
   * });
   */
  getDeterminationById(id: number): Observable<Determination> {
    return this.analysisService.extractDeterminationById(id).pipe(
      switchMap(determination => {
        if (!determination) {
          return throwError(() => new Error(`Determination with id ${id} not found`));
        }
        return [determination];
      })
    );
  }

  /**
   * Creates or updates a determination using PUT.
   * This method sends the complete determination object to the backend.
   * 
   * @param {any} determinationDTO - The complete determination DTO (snake_case format as required by backend)
   * @returns {Observable<Determination>} An observable that emits the created/updated determination.
   * @example
   * determinationService.createOrUpdateDetermination(determinationDTO).subscribe(result => {
   *   // Process result
   * });
   */
  createOrUpdateDetermination(determinationDTO: any): Observable<Determination> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.put<DeterminationDTO>(
      `${this.apiBaseUrl}/determinations`,
      determinationDTO,
      { headers }
    ).pipe(
      map(responseDto => {
        const result = DeterminationMapper.fromDTO(responseDto);
        // Invalidate caches to ensure fresh data
        this.invalidateCache();
        this.analysisService.invalidateCache();
        return result;
      })
    );
  }

  /**
   * Updates an existing determination with partial data (PATCH).
   * 
   * STRATEGY: Since backend may not have PATCH /determination/{id} endpoint yet,
   * we need to get full determination, merge changes, then use analysis endpoint.
   * 
   * @param {number} id - The determination ID
   * @param {Partial<Determination>} updateData - The fields to update (domain format - camelCase)
   * @returns {Observable<Determination>} An observable that emits the updated determination.
   * @example
   * // Update only the name and percentage
   * determinationService.updateDetermination(5, {
   *   name: 'New determination name',
   *   percentageVariationTolerated: 5.5
   * }).subscribe(updated => {
   *   // Process updated determination
   * });
   */
  updateDetermination(id: number, updateData: Partial<Determination>): Observable<Determination> {
    // Try to use dedicated endpoint if exists
    const dto = DeterminationMapper.partialToDTO(updateData);
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.patch<DeterminationDTO>(
      `${this.apiBaseUrl}/determinations/${id}`,
      dto,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = DeterminationMapper.fromDTO(responseDto);
        // Invalidate caches to ensure fresh data
        this.invalidateCache();
        this.analysisService.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Deletes a determination by ID.
   * Note: This endpoint may not exist in backend yet
   * @param {number} id - The determination ID
   * @returns {Observable<void>} An observable that completes when deletion is successful.
   * @example
   * determinationService.deleteDetermination(1).subscribe(() => {
   *   // Handle successful deletion
   * });
   */
  deleteDetermination(id: number): Observable<void> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.delete<void>(
      `${this.apiBaseUrl}/determinations/${id}`,
      { headers }
    ).pipe(
      map(() => {
        // Invalidate caches to ensure fresh data
        this.invalidateCache();
        this.analysisService.invalidateCache();
      })
    );
  }
}
