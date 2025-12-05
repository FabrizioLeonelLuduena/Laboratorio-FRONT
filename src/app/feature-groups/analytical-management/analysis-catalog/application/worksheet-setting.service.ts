import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, map, switchMap, throwError, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../../../../core/authentication/auth.service';
import { WorksheetSetting } from '../domain/worksheet-setting.model';
import { WorksheetSettingDTO } from '../infrastructure/dto/worksheet-setting.dto';
import { WorksheetSettingMapper } from '../infrastructure/mappers/worksheet-setting.mapper';

import { AnalysisService } from './analysis.service';

/**
 * Application service for managing WorksheetSetting operations.
 * Orchestrates CRUD operations for worksheet settings used in analyses.
 * 
 * GET operations delegate to AnalysisService for cache efficiency.
 * Mutation operations (POST/PUT/PATCH/DELETE) use direct HTTP calls and invalidate cache.
 */
@Injectable({
  providedIn: 'root'
})
export class WorksheetSettingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private analysisService = inject(AnalysisService);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;

  /**
   * Local cache for worksheet settings created/updated in this session.
   * This ensures newly created worksheet settings appear in lists even if not yet associated with analyses.
   */
  private localCache = new Map<number, WorksheetSetting>();

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
   * Retrieves all worksheet settings.
   * Combines worksheet settings extracted from analyses with locally cached ones (newly created).
   * @returns {Observable<WorksheetSetting[]>} An observable that emits an array of worksheet settings.
   * @example
   * worksheetSettingService.getWorksheetSettings().subscribe(settings => {
   *   // Process worksheet settings
   * });
   */
  getWorksheetSettings(): Observable<WorksheetSetting[]> {
    return this.analysisService.extractWorksheetSettings().pipe(
      map(settingsFromAnalyses => {
        // Combine settings from analyses with locally cached ones
        const combinedMap = new Map<number, WorksheetSetting>();
        
        // Add settings from analyses first
        settingsFromAnalyses.forEach(setting => {
          if (setting.id) {
            combinedMap.set(setting.id, setting);
          }
        });
        
        // Add/update with locally cached settings (newly created ones)
        this.localCache.forEach((cachedSetting, id) => {
          combinedMap.set(id, cachedSetting);
        });
        
        return Array.from(combinedMap.values());
      })
    );
  }

  /**
   * Retrieves a single worksheet setting by ID.
   * Checks local cache first, then delegates to AnalysisService.
   * @param {number} id - The worksheet setting ID
   * @returns {Observable<WorksheetSetting>} An observable that emits the worksheet setting.
   * @example
   * worksheetSettingService.getWorksheetSettingById(1).subscribe(setting => {
   *   // Process worksheet setting
   * });
   */
  getWorksheetSettingById(id: number): Observable<WorksheetSetting> {
    // Check local cache first (for newly created items)
    const cached = this.localCache.get(id);
    if (cached) {
      return of(cached);
    }

    // Otherwise, get from analyses
    return this.analysisService.extractWorksheetSettingById(id).pipe(
      switchMap(worksheetSetting => {
        if (!worksheetSetting) {
          return throwError(() => new Error(`WorksheetSetting with ID ${id} not found`));
        }
        return [worksheetSetting];
      })
    );
  }

  /**
   * Creates or updates a worksheet setting.
   * Invalidates AnalysisService cache after successful operation.
   * Backend: PUT /api/v1/worksheet_setting (create or update)
   * @param {WorksheetSetting} worksheetSetting - The worksheet setting to create or update
   * @returns {Observable<WorksheetSetting>} An observable that emits the created/updated worksheet setting.
   * @example
   * worksheetSettingService.createOrUpdateWorksheetSetting({
   *   id: 0, // 0 for create, existing ID for update
   *   name: 'Standard',
   *   description: 'Standard worksheet configuration',
   *   entityVersion: 0
   * }).subscribe(created => {
   *   // Process created worksheet setting
   * });
   */
  createOrUpdateWorksheetSetting(worksheetSetting: WorksheetSetting): Observable<WorksheetSetting> {
    const userId = this.getCurrentUserId();
    const headers = this.buildHeaders(userId);
    const dto = WorksheetSettingMapper.toDTO(worksheetSetting);

    return this.http.put<WorksheetSettingDTO>(`${this.apiBaseUrl}/worksheet_setting`, dto, { headers }).pipe(
      map(responseDto => {
        const updated = WorksheetSettingMapper.fromDTO(responseDto);
        
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
