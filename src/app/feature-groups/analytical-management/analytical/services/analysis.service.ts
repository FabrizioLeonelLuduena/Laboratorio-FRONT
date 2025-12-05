import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.production';

import { AnalysisBasicDTO } from '../models/worksheet/worksheet-form.interface';

/**
 * Service responsible for managing analysis-related operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.apiUrl}`;

  /**
   * Retrieves all available analyses in basic format (id and name only).
   * @returns {Observable<AnalysisBasicDTO[]>} An observable that emits an array of basic analyses.
   * @throws Will throw an error if the API request fails.
   * @example
   * // Get all available analyses
   * analysisService.getBasicAnalyses().subscribe(analyses => {
   *   console.log('Available analyses:', analyses);
   * });
   */
  getBasicAnalyses(): Observable<AnalysisBasicDTO[]> {
    return this.http.get<AnalysisBasicDTO[]>(
      `${this.baseApiUrl}/v1/analysis`
    );
  }
}
