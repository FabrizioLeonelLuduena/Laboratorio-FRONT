import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { EmployeePageResponse, EmployeeRequest, EmployeeResponse } from 'src/app/feature-groups/care-management/models/employees.models';

import { environment } from '../../../../environments/environment';

/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  /** Base API URL for doctors endpoint */
  private readonly apiUrl = `${environment.apiUrl}/v2/configurations/employees`;

  /**
   * Creates an instance of DoctorService.
   * @param http Angular HttpClient for API communication
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves a paginated list of employees with optional filters.
   * @param page Page index (default: 0)
   * @param size Page size (default: 10)
   * @param sort Sorting criteria (e.g. "id,asc")
   * @param search Filter by search term
   * @param type Filter by employee type
   * @param status Filter by employee status
   */
  getEmployees(
    page: number = 0,
    size: number = 10,
    sort?: string,
    search?: string,
    type?: string,
    status?: string
  ): Observable<EmployeePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (sort) params = params.set('sort', sort);
    if (search) params = params.set('search', search);
    if (type) params = params.set('type', type);
    if (status) params = params.set('status', status);

    return this.http.get<EmployeePageResponse>(`${this.apiUrl}`, { params });
  }

  /** Retrieves a single employee by ID. */
  getEmployeeById(id: number): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.apiUrl}/${id}`);
  }

  /** Creates a new employee entity. */
  createEmployee(employee: EmployeeRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(this.apiUrl, employee);
  }

  /** Updates an existing employee entity. */
  updateEmployee(id: number, employee: EmployeeRequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.apiUrl}/${id}`, employee
    );
  }

  /** Deletes a employee entity by ID. */
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Uploads a signature file for the specified employee.
   * @param id Employee identifier
   * @param file Signature file to upload (PNG or JPEG)
   * @returns Observable that completes when upload is successful
   */
  uploadSignature(id: number, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<void>(`${this.apiUrl}/${id}/signature`, formData);
  }

  /**
   * Retrieves the signature image for the specified employee.
   * @param id Employee identifier
   * @returns Observable containing the signature image as a Blob
   */
  getSignature(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/signature`, {
      responseType: 'blob'
    });
  }
}
