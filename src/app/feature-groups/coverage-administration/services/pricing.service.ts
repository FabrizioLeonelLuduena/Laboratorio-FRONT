import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { catchError, Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CalculateItemResultDTO, PricingRequestDto } from '../../billing-collections/components/collector/models/dtos';

/**
 * Pricing Service
 * Handles calculation of analysis amounts for coverages.
 * All comments and documentation are in English as requested.
 */
@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages`;

  /**
   * constructor
   */
  constructor(private http: HttpClient) { }

  /**
   * POST /v1/coverages/pricing/calculate
   * Calculates the amounts (total, covered, patient) for the sent analyses.
   */
  getCalc(pricingRequest: PricingRequestDto): Observable<CalculateItemResultDTO[]> {
    if (!pricingRequest?.id_plan || !pricingRequest?.items?.length) {
      return of([]);
    }
    const url = `${this.API_URL}/pricing/calculate`;

    return this.http.post<CalculateItemResultDTO[]>(url, pricingRequest).pipe(
      catchError((_err: HttpErrorResponse) => of([]))
    );
  }


}
