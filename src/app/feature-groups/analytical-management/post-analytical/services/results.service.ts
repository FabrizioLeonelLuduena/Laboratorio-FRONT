import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';


import { environment } from '../../../../../environments/environment';
import { DeterminationsEditRequestDto, DeterminationsEditResponseDto, ResultDetailDto } from '../models/models';

/**
 * Service for result validation operations.
 * Provides methods to validate all determinations for a given result.
 */
@Injectable({ providedIn: 'root' })
export class ResultsService {
  /**
   * Base API URL for validations endpoints.
   */
  private readonly apiUrl = `${environment.apiUrl}/v1/validations`;

  /**
   * Base API URL for studies endpoints.
   */
  private readonly studiesApiUrl = `${environment.apiUrl}/v1/studies`;

  /**
   * Constructor
   */
  private http = inject(HttpClient);

  /**
   * Validates all determinations for a given result.
   * Calls POST /api/v1/validations/{resultId}/validate-all?professionalExternalId=...
   *
   * @param resultId Internal ID of the result entity
   * @param professionalExternalId External ID of the professional performing the validation
   * @returns Observable emitting the updated ResultDetailDto
   */
  validateAll(resultId: number, professionalExternalId: number): Observable<ResultDetailDto> {
    return this.http.post<ResultDetailDto>(
      `${this.apiUrl}/${resultId}/validate-all`,
      {},
      { params: { professionalExternalId: professionalExternalId.toString() } }
    );
  }

  /**
   * Edit determinations for a given result.
   * Calls PUT /api/v1/studies/{protocolCode}/results/{analyticResultId}
   *
   * @param protocolCode Protocol code of the study
   * @param analyticResultId Analytic result ID (numeric ID of the result)
   * @param request Request body with determinations to edit/add
   * @returns Observable emitting the edit response
   */
  editDeterminations(
    protocolCode: string,
    analyticResultId: string,
    request: DeterminationsEditRequestDto
  ): Observable<DeterminationsEditResponseDto> {
    return this.http.put<DeterminationsEditResponseDto>(
      `${this.studiesApiUrl}/${protocolCode}/results/${analyticResultId}`,
      request
    );
  }
}
