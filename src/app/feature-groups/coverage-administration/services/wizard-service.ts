import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CoverageMappers } from '../mappers/mappers';

/**
 * Wizard Service
 * Responsible for interacting with the Wizard API for insurers, plans, and coverages.
 * All comments and documentation are in English as requested.
 */
@Injectable({
  providedIn: 'root'
})
export class WizardService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  /** Base URL for the Insurance API */
  private readonly API_URL = `${this.baseApiUrl}/coverages/wizard`;

  /**
   * Creates an instance of InsuranceService.
   * @param http Angular HttpClient for making HTTP requests.
   */
  constructor(private http: HttpClient) { }

  /**
   * Creates a wizard (insurer, plans, coverages)
   */
  createWizard(request: any): Observable<any> {
    const payload = CoverageMappers.mapWizardPayload(request);
    return this.http.post<any>(`${this.API_URL}`, payload
    );
  }
  /**
   * createPlanWizard.
   */
  createPlanWizard(request: any): Observable<any> {
    const payload = CoverageMappers.mapPlanWizardPayload(request);
    return this.http.post<any>(`${this.API_URL}/plan`, payload
    );
  }
}
