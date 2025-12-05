import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, catchError, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Analysis } from '../models/analysis.interface';

/**
 * Service for analysis (NBU) lookup operations
 */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/analysis`;

  /**
   * Type guard to check if value has the expected raw analysis shape
   */
  private isRawAnalysis(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  /**
   * Gets all analyses
   * @returns Observable of all analyses
   */
  getAllAnalyses(): Observable<Analysis[]> {
    return this.http.get<unknown>(this.baseUrl).pipe(
      map((response) => {
        if (!Array.isArray(response)) return [];

        return response
          .filter(this.isRawAnalysis)
          .map((raw): Analysis => {
            const id = typeof raw['id'] === 'number' ? raw['id'] : Number(raw['id']);
            
            const shortCode = typeof raw['shortCode'] === 'number' ? raw['shortCode'] : 0;
            const name = typeof raw['name'] === 'string' ? raw['name'] : '';
            const description = typeof raw['description'] === 'string' ? raw['description'] : null;
            const familyName = typeof raw['familyName'] === 'string' ? raw['familyName'] : null;
            
            const nbuCode = 
              this.isRawAnalysis(raw['nbu']) && typeof raw['nbu']['nbuCode'] === 'number'
                ? raw['nbu']['nbuCode']
                : null;
            
            const determinations = Array.isArray(raw['determinations']) ? raw['determinations'] : [];

            return {
              id,
              shortCode,
              name,
              description,
              familyName,
              nbuCode,
              determinations
            };
          });
      }),
      catchError((_err: HttpErrorResponse) => of([]))
    );
  }

  /**
   * Gets full information of an analysis by its ID
   * @param analysisId ID of the analysis
   */
  getFullAnalysisById(analysisId: number): Observable<Analysis | null> {
    if (analysisId == null || Number.isNaN(analysisId)) return of(null);

    return this.http.get<unknown>(`${this.baseUrl}/${analysisId}`).pipe(
      map((response): Analysis | null => {
        if (!this.isRawAnalysis(response)) return null;

        const id = typeof response['id'] === 'number' ? response['id'] : analysisId;
        const shortCode = typeof response['shortCode'] === 'number' ? response['shortCode'] : 0;
        const name = typeof response['name'] === 'string' ? response['name'] : '';
        const description = typeof response['description'] === 'string' ? response['description'] : null;
        const familyName = typeof response['familyName'] === 'string' ? response['familyName'] : null;
        
        const nbuCode = 
          this.isRawAnalysis(response['nbu']) && typeof response['nbu']['nbuCode'] === 'number'
            ? response['nbu']['nbuCode']
            : null;
        
        const determinations = Array.isArray(response['determinations']) ? response['determinations'] : [];

        return {
          id,
          shortCode,
          name,
          description,
          familyName,
          nbuCode,
          determinations
        } as Analysis;
      }),
      catchError((_err: HttpErrorResponse) => of(null))
    );
  }
}
