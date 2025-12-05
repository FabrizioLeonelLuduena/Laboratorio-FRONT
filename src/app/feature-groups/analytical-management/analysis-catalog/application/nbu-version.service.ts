import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, forkJoin, tap, shareReplay, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { NbuVersion } from '../domain/nbu-version.model';
import { Nbu } from '../domain/nbu.model';
import { NbuVersionWithDetailsDTO } from '../infrastructure/dto/nbu-version-with-details.dto';
import { NbuVersionDTO } from '../infrastructure/dto/nbu-version.dto';
import { NbuVersionMapper } from '../infrastructure/mappers/nbu-version.mapper';

import { AnalysisService } from './analysis.service';
import { NbuService } from './nbu.service';

/**
 * Application service for managing NBU Version operations.
 * Handles versioning of Nomenclador Bioquímico Único (NBU).
 */
@Injectable({
  providedIn: 'root'
})
export class NbuVersionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private analysisService = inject(AnalysisService);
  private nbuService = inject(NbuService);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;
  /** Cache for NBU versions */
  private versionsCache$?: Observable<NbuVersion[]>;
  /** Cache: map of version → associated NBU IDs (from /nbu_detail) */
  private versionNbuIdsMap$?: Observable<Map<number, number[]>>;

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
   * Retrieves all NBU versions.
   * Backend: GET /api/v1/analysis/nbu/versions
   * @returns {Observable<NbuVersion[]>} An observable that emits an array of NBU versions.
   * @example
   * nbuVersionService.getNbuVersions().subscribe(versions => {
   *   // Process NBU versions
   * });
   */
  getNbuVersions(): Observable<NbuVersion[]> {
    if (!this.versionsCache$) {
      const userId = this.getCurrentUserId();
      const headers = this.buildHeaders(userId);

      this.versionsCache$ = this.http
        .get<NbuVersionDTO[]>(`${this.apiBaseUrl}/analysis/nbu/versions`, { headers })
        .pipe(
          map(dtos => dtos.map(NbuVersionMapper.fromDTO)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.versionsCache$;
  }

  /**
   * Invalidates the versions cache to force fresh data on next request.
   * Call this after any mutation (PUT, DELETE).
   */
  invalidateCache(): void {
    this.versionsCache$ = undefined;
    this.versionNbuIdsMap$ = undefined;
  }

  /**
   * Force refresh versions data (invalidate cache and fetch fresh data).
   * @returns {Observable<NbuVersion[]>} Fresh versions data
   */
  refreshVersions(): Observable<NbuVersion[]> {
    this.invalidateCache();
    return this.getNbuVersions();
  }

  /**
   * Creates a new NBU version.
   * Backend: PUT /api/v1/analysis/nbu/versions/version
   * Requires x-user-id header and minimal valid data in body.
   * @param {Partial<NbuVersion>} nbuVersion - The NBU version to create (only required fields needed)
   * @returns {Observable<NbuVersion>} An observable that emits the created NBU version.
   * @example
   * nbuVersionService.createNbuVersion({
   *   versionCode: '2024',
   *   publicationYear: 2024,
   *   publicationDate: '2024-01-01',
   *   effectivityDate: '2024-02-01'
   * }).subscribe(created => {
   *   // Process created NBU version
   * });
   */
  createNbuVersion(nbuVersion: Partial<NbuVersion>): Observable<NbuVersion> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    
    // Helper to format date-only (YYYY-MM-DD)
    const toDateOnly = (value?: string | Date): string | undefined => {
      if (!value) return undefined;
      const d = typeof value === 'string' ? new Date(value) : value;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Build creation payload: without id, entityVersion, or timestamps
    const dto: Partial<NbuVersionDTO> = {
      // DO NOT send: createdDatetime, lastUpdatedDatetime
      // Logged-in user in created/lastUpdated fields
      createdUser: userId,
      lastUpdatedUser: userId,
      versionCode: nbuVersion.versionCode || '',
      publicationYear: nbuVersion.publicationYear ?? 0,
      updateYear: nbuVersion.updateYear ?? 0,
      publicationDate: toDateOnly(nbuVersion.publicationDate),
      effectivityDate: toDateOnly(nbuVersion.effectivityDate),
      endDate: toDateOnly(nbuVersion.endDate)
    };

    return this.http.put<NbuVersionDTO>(
      `${this.apiBaseUrl}/analysis/nbu/versions/version`, 
      dto, 
      { headers }
    ).pipe(
      map(version => {
        // Invalidate cache after creating new version
        this.invalidateCache();
        return NbuVersionMapper.fromDTO(version);
      })
    );
  }

  /**
   * Updates an existing NBU version.
   * Backend: PUT /api/v1/analysis/nbu/versions/version
   * Uses the same endpoint as creation but sends the full DTO with `id`.
   * Invalidates cache after successful update.
   * @param {NbuVersion} nbuVersion - The NBU version to update
   * @returns {Observable<NbuVersion>} The updated NBU version
   */
  updateNbuVersion(nbuVersion: NbuVersion): Observable<NbuVersion> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // Helper to format date-only (YYYY-MM-DD)
    const toDateOnly = (value?: string | Date): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string' && value.includes('T')) {
        // If it's an ISO string with time, extract only the date
        return value.split('T')[0];
      }
      const d = typeof value === 'string' ? new Date(value) : value;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Build update payload: DO NOT include createdDatetime or lastUpdatedDatetime
    const dto: Partial<NbuVersionDTO> = {
      id: nbuVersion.id ?? 0,
      entityVersion: nbuVersion.entityVersion ?? 0,
      // DO NOT send: createdDatetime, lastUpdatedDatetime
      createdUser: nbuVersion.createdUser ?? userId,
      lastUpdatedUser: userId,
      versionCode: nbuVersion.versionCode || '',
      publicationYear: nbuVersion.publicationYear ?? 0,
      updateYear: nbuVersion.updateYear ?? 0,
      publicationDate: toDateOnly(nbuVersion.publicationDate),
      effectivityDate: toDateOnly(nbuVersion.effectivityDate),
      endDate: toDateOnly(nbuVersion.endDate)
    };

    return this.http.put<NbuVersionDTO>(
      `${this.apiBaseUrl}/analysis/nbu/versions/version`,
      dto,
      { headers }
    ).pipe(
      map(versionDto => {
        this.invalidateCache();
        return NbuVersionMapper.fromDTO(versionDto);
      })
    );
  }

  /**
   * Associates an NBU with a specific version by changing its version.
   * Backend: PUT /api/v1/nbu/{nbuId}/version/{versionId}
   * Requires UB value in request body.
   * Invalidates analysis cache after successful association.
   * @param {number} nbuId - The NBU ID to associate
   * @param {number} versionId - The version ID to associate with
   * @param {number} ub - The UB (Unidad Bioquímica) value for this NBU version
   * @returns {Observable<void>} An observable that completes when the association is created.
   * @example
   * nbuVersionService.associateNbuWithVersion(5, 2, 1.5).subscribe(() => {
   *   console.log('NBU associated with version successfully');
   * });
   */
  associateNbuWithVersion(nbuId: number, versionId: number, ub: number): Observable<void> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.put<void>(
      `${this.apiBaseUrl}/nbu/${nbuId}/version/${versionId}`,
      ub, // Body is the UB value as number
      { headers }
    ).pipe(
      map(() => undefined), // Endpoint returns Nbu, we map to void
      tap(() => {
        // Invalidate all caches to ensure fresh data
        this.analysisService.invalidateCache();
        this.invalidateCache(); // Invalidate versionNbuIdsMap$ and versionsCache$
      })
    );
  }

  /**
   * Associates multiple NBUs with a version in parallel.
   * Uses forkJoin to execute all associations concurrently.
   * @param {number[]} nbuIds - Array of NBU IDs to associate
   * @param {number} versionId - The version ID to associate with
   * @param {number} ub - The UB (Unidad Bioquímica) value for this version
   * @returns {Observable<void>} An observable that completes when all associations are created.
   * @example
   * nbuVersionService.associateMultipleNbus([1, 2, 3], 5, 1.5).subscribe(() => {
   *   console.log('All NBUs associated successfully');
   * });
   */
  associateMultipleNbus(nbuIds: number[], versionId: number, ub: number): Observable<void> {
    if (nbuIds.length === 0) {
      return of(undefined);
    }

    const requests = nbuIds.map(nbuId => 
      this.associateNbuWithVersion(nbuId, versionId, ub)
    );

    return forkJoin(requests).pipe(
      map(() => undefined)
    );
  }

  /**
   * Disassociates an NBU from a specific version.
   * Backend: DELETE /api/v1/nbu/{nbuId}/version/{versionId}
   * No request body required (only path parameters).
   * Invalidates analysis cache after successful disassociation.
   * @param {number} nbuId - The NBU ID to disassociate
   * @param {number} versionId - The version ID to disassociate from
   * @returns {Observable<void>} An observable that completes when the disassociation is successful.
   * @example
   * nbuVersionService.disassociateNbuFromVersion(5, 2).subscribe(() => {
   *   console.log('NBU disassociated from version successfully');
   * });
   */
  disassociateNbuFromVersion(nbuId: number, versionId: number): Observable<void> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.delete<void>(
      `${this.apiBaseUrl}/nbu/${nbuId}/version/${versionId}`,
      { headers }
    ).pipe(
      map(() => undefined), // Endpoint returns Nbu, we map to void
      tap(() => {
        // Invalidate all caches to ensure fresh data
        this.analysisService.invalidateCache();
        this.invalidateCache(); // Invalidate versionNbuIdsMap$ and versionsCache$
      })
    );
  }

  /**
   * Disassociates multiple NBUs from a version in parallel.
   * Uses forkJoin to execute all disassociations concurrently.
   * @param {number[]} nbuIds - Array of NBU IDs to disassociate
   * @param {number} versionId - The version ID to disassociate from
   * @returns {Observable<void>} An observable that completes when all disassociations are successful.
   * @example
   * nbuVersionService.disassociateMultipleNbus([1, 2, 3], 5).subscribe(() => {
   *   console.log('All NBUs disassociated successfully');
   * });
   */
  disassociateMultipleNbus(nbuIds: number[], versionId: number): Observable<void> {
    if (nbuIds.length === 0) {
      return of(undefined);
    }

    const requests = nbuIds.map(nbuId => 
      this.disassociateNbuFromVersion(nbuId, versionId)
    );

    return forkJoin(requests).pipe(
      map(() => undefined)
    );
  }

  /**
   * Retrieves all NBUs associated with a specific version.
   * 
   * ⚠️ WARNING: This endpoint does NOT exist in the backend API yet.
   * The backend needs to implement: GET /api/v1/analysis/nbu/versions/{versionId}/nbus
   * 
   * Alternative approaches until backend is ready:
   * 1. Get all NBUs and filter client-side by version
   * 2. Use NbuService.getNbus() and filter by nbuVersionDetails
   * 3. Wait for backend to implement this endpoint
   * 
   * @param {number} versionId - The version ID
   * @returns {Observable<Nbu[]>} An observable that emits an array of NBUs associated with the version.
   * @example
   * nbuVersionService.getNbusByVersion(2).subscribe(nbus => {
   *   console.log('NBUs in version:', nbus);
   * });
   * 
   * @todo Backend: Implement GET /api/v1/analysis/nbu/versions/{versionId}/nbus
   */
  getNbusByVersion(versionId: number): Observable<Nbu[]> {
    // Filter on client side using cached NBU list
    return this.nbuService.getNbus().pipe(
      map(nbus => nbus.filter(nbu =>
        nbu.nbuVersionDetails?.some(detail => detail.nbuVersion?.id === versionId)
      ))
    );
  }

  /**
   * Gets the map of version → associated NBU IDs using
   * GET /api/v1/analysis/nbu/versions/nbu_detail
   *
   * Returns a cached Map<number, number[]> for efficient use.
   */
  private getVersionNbuIdsMap(): Observable<Map<number, number[]>> {
    if (!this.versionNbuIdsMap$) {
      const userId = this.getCurrentUserId();
      const headers = this.buildHeaders(userId);

      this.versionNbuIdsMap$ = this.http
        .get<NbuVersionWithDetailsDTO[]>(`${this.apiBaseUrl}/analysis/nbu/versions/nbu_detail`, { headers })
        .pipe(
          map(list => {
            const mapResult = new Map<number, number[]>();
            for (const version of list) {
              const ids = (version.nbuDetails || []).map(d => d.nbu?.id).filter((id): id is number => typeof id === 'number');
              mapResult.set(version.id, ids);
            }
            return mapResult;
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.versionNbuIdsMap$;
  }

  /**
   * Returns the IDs of NBUs associated with a version using the cached map
   */
  getAssociatedNbuIdsByVersion(versionId: number): Observable<number[]> {
    return this.getVersionNbuIdsMap().pipe(map(mapResult => mapResult.get(versionId) || []));
  }

  /**
   * Prefetches version details (nbu_detail) to have the map in cache
   * and avoid latency when selecting versions or baseVersion.
   */
  prefetchVersionNbuDetails(): Observable<Map<number, number[]>> {
    return this.getVersionNbuIdsMap();
  }

  /**
   * Gets NBU versions with their associated NBU details.
   * Backend: GET /api/v1/analysis/nbu/versions/nbu_detail
   * 
   * This method returns all versions with their associated NBUs.
   * 
   * @returns {Observable<NbuVersionWithDetailsDTO[]>} Observable that emits versions with details
   * @example
   * nbuVersionService.getNbuVersionsWithDetails().subscribe(versions => {
   *   // Process versions with details
   * });
   */
  getNbuVersionsWithDetails(): Observable<NbuVersionWithDetailsDTO[]> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // Invalidate cache to force fresh data
    this.versionNbuIdsMap$ = undefined;
    this.versionsCache$ = undefined;

    return this.http.get<NbuVersionWithDetailsDTO[]>(
      `${this.apiBaseUrl}/analysis/nbu/versions/nbu_detail`,
      { headers }
    ).pipe(
      tap(() => {
        // Invalidate cache after operation
        this.versionNbuIdsMap$ = undefined;
        this.versionsCache$ = undefined;
      })
    );
  }
}
