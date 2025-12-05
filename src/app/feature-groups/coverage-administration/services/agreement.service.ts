import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AgreementCreateRequestDTO, AgreementResponseDTO, AgreementUpdateRequestDTO } from '../models/agreement.model';

/**
 * Agreement Service
 * Handles creation and update of agreements for insurer plans.
 * All comments and documentation are in English as requested.
 */
@Injectable({
  providedIn: 'root'
})
export class AgreementService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/agreements`;


  /**
   * constructor
   */
  constructor(private http: HttpClient) { }


  /**
   * Creates a new agreement
   */
  createAgreement(payload: AgreementCreateRequestDTO): Observable<AgreementResponseDTO> {
    return this.http
      .post<any>(this.API_URL, payload);
  }

  /**
   * Updates an existing agreement
   */
  updateAgreement(id: number, payload: AgreementUpdateRequestDTO): Observable<AgreementResponseDTO> {
    return this.http
      .put<any>(`${this.API_URL}/${id}`, payload);
  }
  /**
   * Retrieves all coverages (used for reports and dashboard)
   */
  getAllCoverages(): Observable<AgreementResponseDTO[]> {
    return this.http
      .get<any[]>(this.API_URL);
  }

  /**
   * Retrieves all coverages for a given plan, optionally filtered by date range.
   */
  search(planId: number, dateFrom?: string | null, dateTo?: string | null): Observable<AgreementResponseDTO[]> {
    const params: { [param: string]: string | number | boolean } = { planId };

    if (dateFrom) params[dateFrom] = dateFrom;
    if (dateTo) params[dateTo] = dateTo;

    return this.http.get<AgreementResponseDTO[]>(`${this.API_URL}/search`,
      { params });
  }

}
