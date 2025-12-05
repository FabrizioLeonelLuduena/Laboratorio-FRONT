import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, switchMap, throwError, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { Nbu } from '../domain/nbu.model';
import { NbuDTO } from '../infrastructure/dto/nbu.dto';
import { NbuMapper } from '../infrastructure/mappers/nbu.mapper';

import { AnalysisService } from './analysis.service';

/**
 * Application service for handling NBU (Nomenclador Bioquímico Único) operations.
 * Orchestrates CRUD operations and applies business logic.
 * Uses mappers to convert between domain models (camelCase) and DTOs (snake_case).
 * 
 * GET operations delegate to AnalysisService for cache efficiency.
 * Mutation operations (POST/PUT/PATCH/DELETE) use direct HTTP calls and invalidate cache.
 */
@Injectable({
  providedIn: 'root'
})
export class NbuService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private analysisService = inject(AnalysisService);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;
  /** Cache for the NBU list */
  private nbusCache$?: Observable<Nbu[]>;

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
   * Construye headers comunes para llamadas al backend.
   * Incluye 'X-User-Id', y opcionalmente 'Authorization' y 'X-User-Roles' desde localStorage.
   */
  private buildHeaders(userId: number): HttpHeaders {
    let headers = new HttpHeaders({ 'X-User-Id': String(userId) });
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  /**
   * Retrieves all NBUs with full details.
   * Delegates to AnalysisService for cache efficiency.
   * @returns {Observable<Nbu[]>} An observable that emits an array of NBUs in domain format.
   * @example
   * nbuService.getNbus().subscribe(nbus => {
   *   // Process NBUs
   * });
   */
  getNbus(): Observable<Nbu[]> {
    if (!this.nbusCache$) {
      // Delegar a AnalysisService: los NBUs se extraen desde el listado de análisis
      this.nbusCache$ = this.analysisService
        .extractNbus()
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }

    return this.nbusCache$;
  }

  /**
   * Retrieves a single NBU by ID.
   * Delegates to AnalysisService for cache efficiency.
   * @param {number} id - The NBU ID
   * @returns {Observable<Nbu>} An observable that emits the NBU in domain format.
   * @example
   * nbuService.getNbuById(1).subscribe(nbu => {
   *   // Process NBU
   * });
   */
  getNbuById(id: number): Observable<Nbu> {
    return this.getNbus().pipe(
      switchMap(nbus => {
        const found = nbus.find(n => n.id === id);
        if (!found) {
          return throwError(() => new Error(`NBU with ID ${id} not found`));
        }
        return [found];
      })
    );
  }

  /**
   * Updates an existing NBU with partial data (PATCH).
   * Invalidates AnalysisService cache after successful update.
   * @param {number} id - The NBU ID
   * @param {Partial<Nbu>} updateData - The fields to update (domain format - camelCase)
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.updateNbu(5, { determination: 'New determination' }).subscribe(updated => {
   *   // Process updated NBU
   * });
   */
  updateNbu(id: number, updateData: Partial<Nbu>): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    const dto = NbuMapper.partialToDTO(updateData);

    return this.http.patch<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${id}`,
      dto,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        this.nbusCache$ = undefined;
        return updated;
      })
    );
  }

  /**
   * Changes the version of an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: PUT /api/v1/nbu/{id}/version/{versionId}
   * @param {number} nbuId - The NBU ID
   * @param {number} versionId - The new version ID
   * @param {number} ub - The new UB value for this version
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.changeNbuVersion(5, 2, 1.5).subscribe(updated => {
   *   // NBU now uses version 2 with UB 1.5
   * });
   */
  changeNbuVersion(nbuId: number, versionId: number, ub: number): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.put<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/version/${versionId}`,
      ub, // Backend espera un number directo
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        this.nbusCache$ = undefined;
        return updated;
      })
    );
  }

  /**
   * Updates the standard interpretation of an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: PUT /api/v1/nbu/{id}/standard_interpretation
   * @param {number} nbuId - The NBU ID
   * @param {Object} interpretation - The new standard interpretation
   * @param {string} interpretation.interpretation - The interpretation text
   * @param {string} interpretation.minimumWorkStandard - The minimum work standard
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.updateStandardInterpretation(5, {
   *   interpretation: 'Normal range: 70-100 mg/dL',
   *   minimumWorkStandard: 'Use calibrated equipment'
   * }).subscribe(updated => {
   *   // NBU interpretation updated
   * });
   */
  updateStandardInterpretation(
    nbuId: number, 
    interpretation: { interpretation: string; minimumWorkStandard: string }
  ): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    // El interceptor convertirá a snake_case
    return this.http.put<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/standard_interpretation`,
      interpretation,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        this.nbusCache$ = undefined;
        return updated;
      })
    );
  }

  /**
   * Adds synonyms to an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: POST /api/v1/nbu/{id}/synonyms
   * @param {number} nbuId - The NBU ID
   * @param {string[]} synonyms - Array of synonyms to add
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.addSynonyms(5, ['glucosa', 'azucar en sangre']).subscribe(updated => {
   *   // Synonyms added to NBU
   * });
   */
  addSynonyms(nbuId: number, synonyms: string[]): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.post<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/synonyms`,
      synonyms,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        this.nbusCache$ = undefined;
        return updated;
      })
    );
  }

  /**
   * Removes synonyms from an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: DELETE /api/v1/nbu/{id}/synonyms
   * @param {number} nbuId - The NBU ID
   * @param {string[]} synonyms - Array of synonyms to remove
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.removeSynonyms(5, ['glucosa']).subscribe(updated => {
   *   // Synonym removed from NBU
   * });
   */
  removeSynonyms(nbuId: number, synonyms: string[]): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.delete<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/synonyms`,
      { 
        headers,
        body: synonyms 
      }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Adds abbreviations to an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: POST /api/v1/nbu/{id}/abbreviations
   * @param {number} nbuId - The NBU ID
   * @param {string[]} abbreviations - Array of abbreviations to add
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.addAbbreviations(5, ['GLU', 'GLUC']).subscribe(updated => {
   *   // Abbreviations added to NBU
   * });
   */
  addAbbreviations(nbuId: number, abbreviations: string[]): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.post<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/abbreviations`,
      abbreviations,
      { headers }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Removes abbreviations from an NBU.
   * Invalidates AnalysisService cache after successful update.
   * Backend: DELETE /api/v1/nbu/{id}/abbreviations
   * @param {number} nbuId - The NBU ID
   * @param {string[]} abbreviations - Array of abbreviations to remove
   * @returns {Observable<Nbu>} An observable that emits the updated NBU.
   * @example
   * nbuService.removeAbbreviations(5, ['GLU']).subscribe(updated => {
   *   // Abbreviation removed from NBU
   * });
   */
  removeAbbreviations(nbuId: number, abbreviations: string[]): Observable<Nbu> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);

    return this.http.delete<NbuDTO>(
      `${this.apiBaseUrl}/nbu/${nbuId}/abbreviations`,
      { 
        headers,
        body: abbreviations 
      }
    ).pipe(
      map(responseDto => {
        const updated = NbuMapper.fromDTO(responseDto);
        this.analysisService.invalidateCache();
        return updated;
      })
    );
  }

  /**
   * Deletes an NBU by ID.
   * Invalidates AnalysisService cache after successful deletion.
   * ⚠️ WARNING: This endpoint may not be available.
   * Check with backend team if NBU deletion is supported.
   * @param {number} id - The NBU ID
   * @returns {Observable<void>} An observable that completes when deletion is successful.
   * @example
   * nbuService.deleteNbu(1).subscribe(() => {
   *   // Handle successful deletion
   * });
   */
  deleteNbu(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/nbu/${id}`).pipe(
      map(response => {
        this.analysisService.invalidateCache();
        return response;
      })
    );
  }
}
