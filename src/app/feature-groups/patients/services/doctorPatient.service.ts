import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { DoctorResponse } from '../../care-management/models/doctors.model';

/**
 * DoctorPatientService
 * --------------------
 * Lightweight service exposed inside the patients feature to retrieve
 * medical doctor information required by patient protocol views.
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorPatientService {
  /** Base endpoint for doctor configuration APIs */
  private readonly apiUrl = `${environment.apiUrl}/v2/configurations/doctors`;

  /**
   * Initializes the DoctorPatientService with HTTP client dependency.
   */
  constructor(private http: HttpClient) {}

  /**
   * Fetch doctor information by its identifier.
   * @param doctorId Doctor identifier referenced by the attention response
   */
  getDoctorById(doctorId: number): Observable<DoctorResponse> {
    return this.http.get<DoctorResponse>(`${this.apiUrl}/${doctorId}`);
  }
}

