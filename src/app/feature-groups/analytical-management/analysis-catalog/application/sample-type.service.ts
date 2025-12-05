import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, switchMap, throwError, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { SampleType } from '../domain/sample-type.model';
import { SampleTypeDTO } from '../infrastructure/dto/sample-type.dto';
import { SampleTypeMapper } from '../infrastructure/mappers/sample-type.mapper';

import { AnalysisService } from './analysis.service';

/**
 * Application service for managing SampleType operations.
 * Orchestrates CRUD operations for sample types used in analyses.
 * 
 * GET operations delegate to AnalysisService for cache efficiency.
 * Mutation operations (POST/PUT/PATCH/DELETE) use direct HTTP calls and invalidate cache.
 */
@Injectable({
  providedIn: 'root'
})
export class SampleTypeService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private analysisService = inject(AnalysisService);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;

  /**
   * Local cache for sample types created/updated in this session.
   * This ensures newly created sample types appear in lists even if not yet associated with analyses.
   */
  private localCache = new Map<number, SampleType>();

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
   * Retrieves all sample types.
   * Combines sample types extracted from analyses with locally cached ones (newly created).
   * @returns {Observable<SampleType[]>} An observable that emits an array of sample types.
   * @example
   * sampleTypeService.getSampleTypes().subscribe(types => {
   *   // Process sample types
   * });
   */
  getSampleTypes(): Observable<SampleType[]> {
    return this.analysisService.extractSampleTypes().pipe(
      map(typesFromAnalyses => {
        // Combine types from analyses with locally cached ones
        const combinedMap = new Map<number, SampleType>();
        
        // Add types from analyses first
        typesFromAnalyses.forEach(type => {
          if (type.id) {
            combinedMap.set(type.id, type);
          }
        });
        
        // Add/update with locally cached types (newly created ones)
        this.localCache.forEach((cachedType, id) => {
          combinedMap.set(id, cachedType);
        });
        
        return Array.from(combinedMap.values());
      })
    );
  }

  /**
   * Retrieves a single sample type by ID.
   * Checks local cache first, then delegates to AnalysisService.
   * @param {number} id - The sample type ID
   * @returns {Observable<SampleType>} An observable that emits the sample type.
   * @example
   * sampleTypeService.getSampleTypeById(1).subscribe(type => {
   *   // Process sample type
   * });
   */
  getSampleTypeById(id: number): Observable<SampleType> {
    // Check local cache first (for newly created items)
    const cached = this.localCache.get(id);
    if (cached) {
      return of(cached);
    }

    // Otherwise, get from analyses
    return this.analysisService.extractSampleTypeById(id).pipe(
      switchMap(sampleType => {
        if (!sampleType) {
          return throwError(() => new Error(`SampleType with ID ${id} not found`));
        }
        return [sampleType];
      })
    );
  }

  /**
   * Creates or updates a sample type.
   * Invalidates AnalysisService cache after successful operation.
   * Backend: PUT /api/v1/sample_types (create or update)
   * @param {SampleType} sampleType - The sample type to create or update
   * @returns {Observable<SampleType>} An observable that emits the created/updated sample type.
   * @example
   * sampleTypeService.createOrUpdateSampleType({
   *   id: 0, // 0 for create, existing ID for update
   *   name: 'Blood',
   *   entityVersion: 0
   * }).subscribe(created => {
   *   // Process created sample type
   * });
   */
  createOrUpdateSampleType(sampleType: SampleType): Observable<SampleType> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    const dto = SampleTypeMapper.toDTO(sampleType);

    return this.http.put<SampleTypeDTO>(`${this.apiBaseUrl}/sample_types`, dto, { headers }).pipe(
      map(responseDto => {
        const updated = SampleTypeMapper.fromDTO(responseDto);
        
        // Add/update in local cache so it appears in lists immediately
        if (updated.id) {
          this.localCache.set(updated.id, updated);
        }
        
        this.analysisService.invalidateCache();
        return updated;
      })
    );
  }
}
