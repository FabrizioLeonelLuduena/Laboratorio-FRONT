import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';




/**
 * Service for downloading study reports.
 *
 * Responsibilities:
 * - Provide a method to download study reports by study ID
 * - Handle authentication headers for backend requests
 * - Return the PDF file as a Blob
 *
 * Features:
 * - Authentication headers for backend requests
 * - PDF download functionality
 * - Error handling
 */
@Injectable({
  providedIn: 'root'
})
export class PostAnalyticalServiceService {
  private apiUrl = environment.apiUrl + '/v1';

  /**
   * Creates an instance of PostAnalyticalServiceService.
   * @param http - Angular HttpClient used for API requests.
   */
  constructor(private http: HttpClient) { }

  /**
   * Downloads a study report PDF by study ID.
   * Calls GET /api/v1/reports/study/{studyId}/download endpoint.
   *
   * @param studyId - The unique identifier of the study
   * @returns Observable emitting the PDF file as a Blob
   */
  downloadReportByStudyId(studyId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/study/${studyId}/download`, {
      responseType: 'blob'
    });
  }
}
