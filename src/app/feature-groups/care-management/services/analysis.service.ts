import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, catchError, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AnalysisApp } from '../models/analysis.models';
import { Analysis } from '../models/analysis.models';

/**
 * Service for analysis (NBU) lookup operations
 */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/analysis`;

  /**
   * Fetch a single analysis by exact short_code
   * GET /api/v1/analysis?short_code={shortCode}
   */
  getByShortCode(shortCode: number): Observable<Analysis | null> {
    if (shortCode == null || Number.isNaN(shortCode)) return of(null);

    const url = `${this.baseUrl}?short_code=${shortCode}`;

    return this.http.get<any[]>(url).pipe(
      // Map only required fields
      map((list) => {
        if (!Array.isArray(list)) return null;
        // Note: caseConverterInterceptor converts snake_case to camelCase
        const found = list.find((it) => it?.shortCode === shortCode);
        if (!found) return null;

        const mapped: Analysis = {
          id: Number(found.id),
          shortCode: Number(found.shortCode),
          name: String(found.name ?? ''),
          description: found.description ?? null,
          familyName: found.familyName ?? null,
          nbuCode: found?.nbu?.nbuCode ?? null,
          determinations: found.determinations ?? []
        };
        return mapped;
      }),
      // Gracefully handle errors
      catchError((_err: HttpErrorResponse) => of(null))
    );
  }

  /**
   * Get analysis by ID
   * @param analysisId The ID of the analysis to retrieve
   * @returns Observable of unknown type (to be mapped to AnalysisResponse)
   */
  /**
   * GET /v1/analysis/{id}
   * Devuelve un AnalysisItem (o lo mapea) por ID, o null si no existe / error.
   * Si tu backend en realidad usa query (?id=), cambiá la URL debajo.
   */
  getAnalysisById(analysisId: number): Observable<AnalysisApp | null> {
    if (analysisId == null || Number.isNaN(analysisId)) return of(null);

    return this.http.get<unknown>(`${this.baseUrl}/${analysisId}`).pipe(
      map((raw: any) => {
        if (!raw) return null;

        // Note: caseConverterInterceptor converts snake_case to camelCase
        const item: AnalysisApp = {
          id: Number(raw.id ?? analysisId),
          shortCode: Number(raw.shortCode) || 0,
          code: String(raw.code ?? raw.shortCode ?? ''),
          name: String(raw.name ?? ''),
          description: raw.description ?? null
        };

        return item;
      }),
      catchError((_err: HttpErrorResponse) => of(null))
    );
  }

  /**
   * Gets full information of an analysis by its ID
   * @param analysisId ID of the analysis
   */
  getFullAnalysisById(analysisId: number): Observable<Analysis | null> {
    if (analysisId == null || Number.isNaN(analysisId)) return of(null);

    return this.http.get<unknown>(`${this.baseUrl}/${analysisId}`).pipe(
      map((raw: any) => {
        if (!raw) return null;

        // Note: caseConverterInterceptor converts snake_case to camelCase
        const item: Analysis = {
          id: Number(raw.id ?? analysisId),
          code: String(raw.code ?? raw.shortCode ?? ''),
          shortCode: Number(raw.shortCode ?? 0),
          name: String(raw.name ?? ''),
          description: raw.description ?? null,
          familyName: raw.familyName ?? null,
          nbuCode: raw?.nbu?.nbuCode ?? null,
          determinations: raw.determinations ?? []
        } as Analysis;

        return item;
      }),
      catchError((_err: HttpErrorResponse) => of(null))
    );
  }
}
