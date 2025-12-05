import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { PatientDashboardDto } from '../dto/patient-report.dto';

/**
 * Defines the payload for the getDashboard method.
 */
export interface GetDashboardPayload {
  minAge: number;
  maxAge: number;
  gender?: string;
  sexAtBirth?: string;
  startDate: string;
  endDate: string;
}

/**
 * Service for fetching patient dashboard data.
 */
@Injectable({
  providedIn: 'root'
})
export class PatientsDashboardService {
  private readonly API_URL = environment.apiUrl+'/v1/patients/reports';

  /**
   * Creates an instance of PatientsDashboardService.
   * @param http The HttpClient for making API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches the dashboard data from the API.
   * @param payload The payload for the request.
   * @returns An observable of the dashboard data.
   */
  getDashboard(
    payload: GetDashboardPayload
  ): Observable<PatientDashboardDto> {
    return this.http.post<PatientDashboardDto>(
      `${this.API_URL}/dashboard`,
      payload
    );
  }
}
