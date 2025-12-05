import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, catchError, throwError, shareReplay, forkJoin, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { Analysis } from '../domain/analysis.model';
import { Determination } from '../domain/determination.model';
import { Nbu } from '../domain/nbu.model';
import { SampleType } from '../domain/sample-type.model';
import { WorksheetSetting } from '../domain/worksheet-setting.model';
import { AnalysisDTO } from '../infrastructure/dto/analysis.dto';
import { AnalysisMapper } from '../infrastructure/mappers/analysis.mapper';

/**
 * Basic DTO for analysis (only id and name)
 */
export interface AnalysisBasicDTO {
  id: number;
  name: string;
}

/**
 * Application service for managing analysis-related operations.
 * Orchestrates CRUD operations and applies business logic.
 * Uses mappers to convert between domain models (camelCase) and DTOs (snake_case).
 */
@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiRoot = environment.apiUrl.replace(/\/+$/u, '');
  /** Base endpoint for analysis (avoids duplicating /v1 if it's already in apiUrl) */
  private readonly analysisBase = this.apiRoot.endsWith('/v1')
    ? `${this.apiRoot}/analysis`
    : `${this.apiRoot}/v1/analysis`;

  /**
   * Cached observable for analyses list
   * Shared across all subscribers to avoid duplicate HTTP calls
   * Uses shareReplay to cache result and refCount to clean up when no subscribers
   */
  private analysesCache$?: Observable<Analysis[]>;

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
   * Builds common headers for backend calls.
   * Includes 'X-User-Id', and optionally 'Authorization' and 'X-User-Roles' from AuthService.
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
   * Handles HTTP errors and transforms them into user-friendly messages.
   * @param {HttpErrorResponse} error - The HTTP error response
   * @param {string} operation - The operation that failed (for logging)
   * @returns {Observable<never>} An observable that errors with a user-friendly message
   */
  private handleError(error: HttpErrorResponse, _operation: string): Observable<never> {
    let userMessage = 'Ocurrió un error inesperado. Por favor, intente nuevamente más tarde.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      // console.error(`${operation} - Client error:`, error.error.message);
      userMessage = 'Error de red. Por favor, verifique su conexión e intente nuevamente.';
    } else {
      // Backend returned an unsuccessful response code
      // console.error(`${operation} - Server error:`, {
      //   status: error.status,
      //   message: error.message,
      //   body: error.error
      // });

      switch (error.status) {
      case 400:
        userMessage = 'Criterios de búsqueda inválidos. Por favor, verifique su entrada e intente nuevamente.';
        break;
      case 401:
        userMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        break;
      case 403:
        userMessage = 'No tiene permisos para realizar esta acción.';
        break;
      case 404:
        userMessage = 'El recurso solicitado no fue encontrado.';
        break;
      case 500:
        userMessage = 'Error del servidor. Por favor, intente nuevamente más tarde o contacte a soporte.';
        break;
      case 503:
        userMessage = 'Servicio temporalmente no disponible. Por favor, intente nuevamente en unos momentos.';
        break;
      default:
        if (error.status >= 500) {
          userMessage = 'Error del servidor. Por favor, intente nuevamente más tarde.';
        }
      }
    }

    return throwError(() => new Error(userMessage));
  }

  /**
   * Retrieves paginated analyses with full details.
   * Backend: GET /api/v1/analysis/page
   * 
   * @param {number} page - Page number (0-indexed, required)
   * @param {number} size - Page size (required)
   * @param {string} sortBy - Field to sort by (default: "id")
   * @param {boolean} isAscending - Sort direction (default: true)
   * @param {object} filters - Optional filters: shortCode, nbuCode, name, familyName, description, code, nbuDetermination, nbuAbbreviation
   * @returns {Observable<PageResponse<Analysis>>} An observable that emits a paginated response in domain format.
   * @example
   * analysisService.getAnalysesPaginated(0, 10, 'name', true).subscribe(page => {
   *   console.log('Total:', page.totalElements);
   *   console.log('Analyses:', page.content);
   * });
   */
  getAnalysesPaginated(
    page: number,
    size: number,
    sortBy: string = 'id',
    isAscending: boolean = true,
    filters?: {
      shortCode?: number;
      nbuCode?: number;
      name?: string;
      familyName?: string;
      description?: string;
      code?: string;
      nbuDetermination?: string;
      nbuAbbreviation?: string;
    }
  ): Observable<PageResponse<Analysis>> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('isAscending', isAscending.toString());

    // Add optional filters
    if (filters) {
      const filterMap: { [key: string]: string } = {
        shortCode: 'short_code',
        nbuCode: 'nbu_code',
        name: 'name',
        familyName: 'family_name',
        description: 'description',
        code: 'code',
        nbuDetermination: 'nbu_determination',
        nbuAbbreviation: 'nbu_abbreviation'
      };

      for (const key of Object.keys(filters) as Array<keyof typeof filters>) {
        const value = filters[key];
        if (value !== undefined) {
          // For numbers, include even if 0; for strings, check if not empty
          if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) {
            const paramName = filterMap[key];
            if (paramName) {
              params = params.set(paramName, String(value));
            }
          }
        }
      }
    }

    return this.http
      .get<PageResponse<AnalysisDTO>>(`${this.analysisBase}/page`, { headers, params })
      .pipe(
        map((pageDto: PageResponse<AnalysisDTO>) => ({
          ...pageDto,
          content: pageDto.content.map(AnalysisMapper.fromDTO)
        }))
      );
  }

  /**
   * Retrieves all analyses with full details.
   * Uses paginated endpoint and fetches all pages to maintain backward compatibility.
   * Uses shareReplay to cache result and avoid multiple HTTP calls.
   * Cache is invalidated after mutations (PUT, PATCH, DELETE).
   * 
   * @returns {Observable<Analysis[]>} An observable that emits an array of analyses in domain format.
   * @example
   * analysisService.getAnalyses().subscribe(analyses => {
   *   // Process analyses
   * });
   */
  getAnalyses(): Observable<Analysis[]> {
    if (!this.analysesCache$) {
      // Fetch first page to get total count
      this.analysesCache$ = this.getAnalysesPaginated(0, 100, 'id', true).pipe(
        switchMap(firstPage => {
          const allAnalyses: Analysis[] = [...firstPage.content];
          
          // If there are more pages, fetch them all
          if (firstPage.totalPages > 1) {
            const remainingPages: Observable<PageResponse<Analysis>>[] = [];
            for (let page = 1; page < firstPage.totalPages; page++) {
              remainingPages.push(this.getAnalysesPaginated(page, 100, 'id', true));
            }
            
            // Use forkJoin to fetch all remaining pages in parallel
            return forkJoin(remainingPages).pipe(
              map(pages => {
                pages.forEach(page => {
                  allAnalyses.push(...page.content);
                });
                return allAnalyses;
              })
            );
          }
          
          return of(allAnalyses);
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.analysesCache$;
  }

  /**
   * Retrieves a single analysis by ID.
   * @param {number} id - The analysis ID
   * @returns {Observable<Analysis>} An observable that emits the analysis in domain format.
   * @example
   * analysisService.getAnalysisById(1).subscribe(analysis => {
   *   // Process analysis
   * });
   */
  getAnalysisById(id: number): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    return this.http.get<AnalysisDTO>(`${this.analysisBase}/${id}`, { headers }).pipe(
      map(AnalysisMapper.fromDTO)
    );
  }

  /**
   * Updates an existing analysis using PATCH.
   * Backend: PATCH /api/v1/analysis/{id}
   * 
   * MODIFIABLE FIELDS:
   * - short_code (number) - Short internal identifier code
   * - name (string) - Analysis name
   * - family_name (string) - Family/classification name
   * - description (string) - Detailed description
   * - code (string) - Alphanumeric code
   * - ub (number) - Base Unit for cost calculation
   * 
   * REQUIRED FIELD:
   * - entity_version (number) - Current version for optimistic concurrency control
   * 
   * NOTE: Only included fields that differ from current value are updated.
   * Related entities (nbu, sampleType, determinations, worksheetSetting) are NOT modified here.
   * Use updateAnalysisNbu() to change the associated NBU.
   * 
   * @param {number} id - The analysis ID
   * @param {Partial<Analysis>} updateData - The fields to update (domain format - camelCase).
   *                                         DEBE incluir entityVersion obligatoriamente.
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @throws {Error} If entityVersion is not provided
   * @example
   * // Update name and description
   * analysisService.updateAnalysis(1, {
   *   entityVersion: 0,
   *   name: 'Glucemia basal',
   *   description: 'Medición de glucosa en ayunas'
   * }).subscribe(updated => {
   *   console.log('Analysis updated:', updated);
   * });
   */
  updateAnalysis(id: number, updateData: Partial<Analysis>): Observable<Analysis> {
    // Validate that entityVersion is present (required for optimistic locking)
    if (updateData.entityVersion === undefined) {
      throw new Error('entityVersion is required for optimistic locking. Please include it in updateData.');
    }

    const dto = AnalysisMapper.partialToDTO(updateData);
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.patch<AnalysisDTO>(
      `${this.analysisBase}/${id}`,
      dto,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Updates the NBU linked to an analysis.
   * Uses specific endpoint PATCH /api/v1/analysis/{id}/nbu
   * Backend expects: just the NBU ID as a number (not an object)
   * @param {number} analysisId - The analysis ID
   * @param {number} nbuId - The new NBU ID to link
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @example
   * analysisService.updateAnalysisNbu(1, 123).subscribe(updated => {
   *   // Analysis now linked to NBU with id 123
   * });
   */
  updateAnalysisNbu(analysisId: number, nbuId: number): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // Backend expects just the numeric ID, not an object
    return this.http.patch<AnalysisDTO>(
      `${this.analysisBase}/${analysisId}/nbu`,
      nbuId, // Send the ID directly as a number
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Updates the SampleType linked to an analysis.
   * Backend: PUT /api/v1/analysis/{id}/sample_type
   * @param {number} analysisId - The analysis ID
   * @param {number} sampleTypeId - The new SampleType ID to link
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @example
   * analysisService.updateAnalysisSampleType(1, 5).subscribe(updated => {
   *   // Analysis now linked to SampleType with id 5
   * });
   */
  updateAnalysisSampleType(analysisId: number, sampleTypeId: number): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.put<AnalysisDTO>(
      `${this.analysisBase}/${analysisId}/sample_type`,
      sampleTypeId, // Backend expects a direct int64
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Updates the WorksheetSetting linked to an analysis.
   * Backend: PUT /api/v1/analysis/{id}/worksheet_setting
   * @param {number} analysisId - The analysis ID
   * @param {number} worksheetSettingId - The new WorksheetSetting ID to link
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @example
   * analysisService.updateAnalysisWorksheetSetting(1, 3).subscribe(updated => {
   *   // Analysis now linked to WorksheetSetting with id 3
   * });
   */
  updateAnalysisWorksheetSetting(analysisId: number, worksheetSettingId: number): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.put<AnalysisDTO>(
      `${this.analysisBase}/${analysisId}/worksheet_setting`,
      worksheetSettingId, // Backend expects a direct int64
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Adds determinations to an analysis.
   * Backend: POST /api/v1/analysis/{id}/determinations
   * @param {number} analysisId - The analysis ID
   * @param {number[]} determinationIds - Array of determination IDs to add
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @example
   * analysisService.addDeterminations(1, [10, 11, 12]).subscribe(updated => {
   *   // Analysis now has 3 more determinations
   * });
   */
  addDeterminations(analysisId: number, determinationIds: number[]): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.post<AnalysisDTO>(
      `${this.analysisBase}/${analysisId}/determinations`,
      determinationIds,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Removes determinations from an analysis.
   * Backend: DELETE /api/v1/analysis/{id}/determinations
   * @param {number} analysisId - The analysis ID
   * @param {number[]} determinationIds - Array of determination IDs to remove
   * @returns {Observable<Analysis>} An observable that emits the updated analysis.
   * @example
   * analysisService.removeDeterminations(1, [10, 11]).subscribe(updated => {
   *   // Analysis no longer has those 2 determinations
   * });
   */
  removeDeterminations(analysisId: number, determinationIds: number[]): Observable<Analysis> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // DELETE with body requires special configuration
    return this.http.delete<AnalysisDTO>(
      `${this.analysisBase}/${analysisId}/determinations`,
      { 
        headers,
        body: determinationIds 
      }
    ).pipe(
      map(responseDto => {
        const updated = AnalysisMapper.fromDTO(responseDto);
        this.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Searches analyses by multiple criteria (all optional, combined with OR logic).
   * Backend: GET /api/v1/analysis?param1=value1&param2=value2...
   * @param {Object} params - Search parameters (all optional)
   * @param {number} params.shortCode - Search by exact short code
   * @param {number} params.nbuCode - Search by exact NBU code
   * @param {string} params.name - Search by name (contains)
   * @param {string} params.familyName - Search by family name (contains)
   * @param {string} params.description - Search by description (contains)
   * @param {string} params.code - Search by code (contains)
   * @param {string} params.nbuDetermination - Search by NBU determination (contains)
   * @param {string} params.nbuAbbreviation - Search by NBU abbreviation (contains)
   * @returns {Observable<Analysis[]>} An observable that emits matching analyses.
   * @example
   * analysisService.searchAnalyses({ 
   *   name: 'glucosa',
   *   familyName: 'bioquimica'
   * }).subscribe(results => {
   *   // Process search results
   * });
   */
  searchAnalyses(params: {
    shortCode?: number;
    nbuCode?: number;
    name?: string;
    familyName?: string;
    description?: string;
    code?: string;
    nbuDetermination?: string;
    nbuAbbreviation?: string;
  }): Observable<Analysis[]> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // Build query params in snake_case (interceptor handles it)
    const httpParams: any = {};
    if (params.shortCode !== undefined) httpParams.short_code = params.shortCode;
    if (params.nbuCode !== undefined) httpParams.nbu_code = params.nbuCode;
    if (params.name) httpParams.name = params.name;
    if (params.familyName) httpParams.family_name = params.familyName;
    if (params.description) httpParams.description = params.description;
    if (params.code) httpParams.code = params.code;
    if (params.nbuDetermination) httpParams.nbu_determination = params.nbuDetermination;
    if (params.nbuAbbreviation) httpParams.nbu_abbreviation = params.nbuAbbreviation;

    return this.http.get<AnalysisDTO[]>(`${this.analysisBase}`, {
      headers,
      params: httpParams
    }).pipe(
      map(dtos => dtos.map(AnalysisMapper.fromDTO)),
      catchError(error => this.handleError(error, 'searchAnalyses'))
    );
  }

  /**
   * Deletes an analysis by ID.
   * @param {number} id - The analysis ID
   * @returns {Observable<void>} An observable that completes when deletion is successful.
   * @example
   * analysisService.deleteAnalysis(id).subscribe(() => {
   *   // Handle successful deletion
   * });
   */
  deleteAnalysis(id: number): Observable<void> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    return this.http.delete<void>(`${this.analysisBase}/${id}`, { headers }).pipe(
      map(() => {
        this.invalidateCache();
      })
    );
  }

  // ========== Extraction Methods (for delegated services) ==========

  /**
   * Extract all unique determinations from analyses
   * @returns Flat array of determinations from all analyses
   * @example
   * analysisService.extractDeterminations().subscribe(determinations => {
   *   // Use determinations in dropdown, table, etc.
   * });
   */
  extractDeterminations(): Observable<Determination[]> {
    return this.getAnalyses().pipe(
      map(analyses => {
        const determinationsMap = new Map<number, Determination>();

        for (const analysis of analyses) {
          if (analysis.determinations) {
            for (const det of analysis.determinations) {
              if (det.id && !determinationsMap.has(det.id)) {
                determinationsMap.set(det.id, det);
              }
            }
          }
        }

        return Array.from(determinationsMap.values());
      })
    );
  }

  /**
   * Extract specific determination by ID
   * @param {number} id - Determination ID to find
   * @returns {Observable<Determination | null>} The determination or null if not found
   */
  extractDeterminationById(id: number): Observable<Determination | null> {
    return this.extractDeterminations().pipe(
      map(determinations => determinations.find(d => d.id === id) || null)
    );
  }

  /**
   * Extract all unique NBUs from analyses
   * @returns Flat array of unique NBUs
   */
  extractNbus(): Observable<Nbu[]> {
    return this.getAnalyses().pipe(
      map(analyses => {
        const nbusMap = new Map<number, Nbu>();

        for (const analysis of analyses) {
          if (analysis.nbu && analysis.nbu.id && !nbusMap.has(analysis.nbu.id)) {
            nbusMap.set(analysis.nbu.id, analysis.nbu);
          }
        }

        return Array.from(nbusMap.values());
      })
    );
  }

  /**
   * Extract specific NBU by ID
   * @param {number} id - NBU ID to find
   * @returns {Observable<Nbu | null>} The NBU or null if not found
   */
  extractNbuById(id: number): Observable<Nbu | null> {
    return this.extractNbus().pipe(
      map(nbus => nbus.find(n => n.id === id) || null)
    );
  }

  /**
   * Extract all unique sample types from analyses
   * @returns Flat array of unique sample types
   */
  extractSampleTypes(): Observable<SampleType[]> {
    return this.getAnalyses().pipe(
      map(analyses => {
        const sampleTypesMap = new Map<number, SampleType>();

        for (const analysis of analyses) {
          if (analysis.sampleType && analysis.sampleType.id && !sampleTypesMap.has(analysis.sampleType.id)) {
            sampleTypesMap.set(analysis.sampleType.id, analysis.sampleType);
          }
        }

        return Array.from(sampleTypesMap.values());
      })
    );
  }

  /**
   * Extract specific sample type by ID
   * @param {number} id - Sample type ID to find
   * @returns {Observable<SampleType | null>} The sample type or null if not found
   */
  extractSampleTypeById(id: number): Observable<SampleType | null> {
    return this.extractSampleTypes().pipe(
      map(sampleTypes => sampleTypes.find(st => st.id === id) || null)
    );
  }

  /**
   * Extract all unique worksheet settings from analyses
   * @returns Flat array of unique worksheet settings
   */
  extractWorksheetSettings(): Observable<WorksheetSetting[]> {
    return this.getAnalyses().pipe(
      map(analyses => {
        const worksheetSettingsMap = new Map<number, WorksheetSetting>();

        for (const analysis of analyses) {
          if (analysis.worksheetSetting && analysis.worksheetSetting.id && !worksheetSettingsMap.has(analysis.worksheetSetting.id)) {
            worksheetSettingsMap.set(analysis.worksheetSetting.id, analysis.worksheetSetting);
          }
        }

        return Array.from(worksheetSettingsMap.values());
      })
    );
  }

  /**
   * Extract specific worksheet setting by ID
   * @param {number} id - Worksheet setting ID to find
   * @returns {Observable<WorksheetSetting | null>} The worksheet setting or null if not found
   */
  extractWorksheetSettingById(id: number): Observable<WorksheetSetting | null> {
    return this.extractWorksheetSettings().pipe(
      map(worksheetSettings => worksheetSettings.find(ws => ws.id === id) || null)
    );
  }

  /**
   * Invalidate cache to force fresh data on next request
   * Call this after any mutation (PUT, PATCH, DELETE)
   * @example
   * this.analysisService.invalidateCache();
   * this.analysisService.getAnalyses().subscribe(); // Will fetch fresh data
   */
  invalidateCache(): void {
    this.analysesCache$ = undefined;
  }

  /**
   * Force refresh data (invalidate cache and fetch fresh data)
   * @returns {Observable<Analysis[]>} Fresh analyses data
   * @example
   * refreshButton() {
   *   this.analysisService.refreshData().subscribe();
   * }
   */
  refreshData(): Observable<Analysis[]> {
    this.invalidateCache();
    return this.getAnalyses();
  }
}
