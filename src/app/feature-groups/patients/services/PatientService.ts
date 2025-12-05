import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AgeGenderDistributionDto,
  CoverageAgeGenderDto,
  MonthlyPatientsReportDto,
  PatientDashboardDto,
  PatientIncompleteDataDto,
  PatientReportRequestDto
} from '../dto/patient-report.dto';
import {
  Patient,
  PatientAttentionResponse,
  PatientMin,
  PatientRequest,
  PatientResponse
} from '../models/PatientModel';

/** Minimal Page interface to type backend pageable responses */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

/**
 * Patient Service
 */
@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = environment.apiUrl + '/v1/patients';

  /**
   * Creates an instance of PatientService.
   * @param http - Angular HttpClient used for API requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Create a new patient.
   * @param patient - Patient object to create.
   * @returns Observable emitting the created patient.
   */
  /** Create a new patient (POST) */
  createPatient(patient: PatientRequest): Observable<PatientResponse> {
    return this.http.post<PatientResponse>(`${this.apiUrl}`, patient);
  }

  /**
   * Search and paginate patients from the API.
   * Mirrors backend signature: q, state, status and Pageable (?page, ?size, ?sort=field,dir)
   */
  searchPatients(
    params: {
      q?: string | null;
      state: 'active' | 'inactive' | 'all'
      status?: 'MIN' | 'COMPLETE' | 'VERIFIED' | null;
      page?: number;
      size?: number;
      sort?: { field: string; order: 'asc' | 'desc' }[];
    }
  ): Observable<Page<PatientMin>> {
    let httpParams = new HttpParams();

    if (params.q && params.q.trim().length > 0) {
      httpParams = httpParams.set('q', params.q.trim());
    }
    if (params.state) {
      httpParams = httpParams.set('state', params.state);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (typeof params.page === 'number') {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (typeof params.size === 'number') {
      httpParams = httpParams.set('size', String(params.size));
    }
    // Multiple sort params are allowed: sort=lastName,asc&sort=firstName,asc
    if (params.sort && params.sort.length) {
      params.sort.forEach(s => {
        const dir = s.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';
        httpParams = httpParams.append('sort', `${s.field},${dir}`);
      });
    }

    // Use pageable search endpoint
    return this.http.get<Page<PatientMin>>(`${this.apiUrl}/search`, { params: httpParams });
  }

  /**
   * Get a patient by ID.
   * @param id - Patient unique identifier.
   * @returns Observable emitting the requested patient.
   */
  getPatientById(id: number): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get a patient by ID with all protocols and attentions.
   * @param id - Patient unique identifier.
   * @returns Observable emitting the requested patient.
   */
  getPatientWithProtocolById(id: number): Observable<PatientAttentionResponse> {
    return this.http.get<PatientAttentionResponse>(`${this.apiUrl}/${id}/integration`);
  }

  /**
   * Update an existing patient.
   * @param id - Patient unique identifier.
   * @param patient - Updated patient data.
   * @returns Observable emitting the updated patient.
   */
  updatePatient(id: number, patient: Patient): Observable<any> {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { isActive, status, ...payload } = patient;
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete a patient by ID.
   * @param id - Patient unique identifier.
   * @returns Observable<void> when deletion is complete.
   */
  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Check if patient exists by dni
   * @param dni
   */
  existsByDni(dni: string): Observable<boolean> {
    const params = new HttpParams().set('dni', dni);
    return this.http.get<boolean>(`${this.apiUrl}/exists`, { params });
  }

  /**
   * Find a patient by DNI.
   * Calls GET /api/v1/patients/dni/{dni} in the backend.
   * @param dni - Patient national identification number (7–8 digits).
   * @returns Observable emitting the full PatientResponse object.
   */
  findByDNI(dni: string | number): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(`${this.apiUrl}/dni/${dni}`);
  }

  // ------------------- ANALYTICS & REPORTS -------------------

  /**
   * Get patient reports.
   * @returns Observable emitting the list of patient reports.
   */
  getPatientReports(): Observable<MonthlyPatientsReportDto[]> {
    return this.http.get<MonthlyPatientsReportDto[]>(`${this.apiUrl}/reports`);
  }

  /**
   * Retrieves the number of new patient registrations per month,
   * optionally filtered by date range, gender, or age range.
   *
   * @param request Filtering parameters for the report (optional)
   * @returns Observable emitting a list of MonthlyPatientsReportDto
   */
  getMonthlyRegistrations(request?: PatientReportRequestDto):
    Observable<MonthlyPatientsReportDto[]> {
    return this.http.post<MonthlyPatientsReportDto[]>
    (`${this.apiUrl}/reports/monthly`, request ?? {});
  }

  /**
   * Returns the distribution of patients by age, gender, and sex at birth.
   *
   * @param request Filter criteria such as age range, gender, or period
   * @returns Observable emitting a list of AgeGenderDistributionDto
   */
  getAgeGenderDistribution(request: PatientReportRequestDto):
    Observable<AgeGenderDistributionDto[]> {
    return this.http.post<AgeGenderDistributionDto[]>
    (`${this.apiUrl}/reports/distribution/age-gender`, request);
  }

  /**
   * Returns patient distribution by coverage plan,
   * grouped by gender, sex at birth, and age range.
   *
   * @param request Report filters including coverage, age, and gender
   * @returns Observable emitting a list of CoverageAgeGenderDto
   */
  getCoverageDistribution(request: PatientReportRequestDto):
    Observable<CoverageAgeGenderDto[]> {
    return this.http.post<CoverageAgeGenderDto[]>
    (`${this.apiUrl}/reports/distribution/coverage`, request);
  }

  /**
   * Retrieves the list of patients with incomplete or missing information
   * (e.g., missing contact, address, or coverage details).
   *
   * @returns Observable emitting a list of PatientIncompleteDataDto
   */
  getPatientsWithIncompleteData():
    Observable<PatientIncompleteDataDto[]> {
    return this.http.get<PatientIncompleteDataDto[]>
    (`${this.apiUrl}/reports/incomplete`);
  }

  /**
   * Retrieves a complete analytic dashboard combining multiple reports:
   * total patients, growth rate, incomplete data percentage, and distributions.
   *
   * @param request Report filters to refine dashboard results
   * @returns Observable emitting a PatientDashboardDto
   */
  getDashboard(request: PatientReportRequestDto):
    Observable<PatientDashboardDto> {
    return this.http.post<PatientDashboardDto>
    (`${this.apiUrl}/reports/dashboard`, request);
  }

  /**
   * Exports the patient analytic report to an Excel (.xlsx) file.
   *
   * @returns Observable emitting the binary content of the Excel file
   */
  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/export/excel`, { responseType: 'blob' });
  }

  /**
   * Exports the patient analytic report to a PDF file.
   *
   * @returns Observable emitting the binary content of the PDF file
   */
  exportPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/export/pdf`, { responseType: 'blob' });
  }

}
