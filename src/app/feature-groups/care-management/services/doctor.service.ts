import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { DoctorRequest, DoctorResponse, RegistrationType } from 'src/app/feature-groups/care-management/models/doctors.model';
import { environment } from 'src/environments/environment';

/**
 *
 */
export interface DoctorFilter {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  size?: number;
  sortField?: string;
  sortOrder?: 1 | -1;
}

/**
 * Service for managing doctor entities via REST API.
 */
@Injectable({ providedIn: 'root' })
export class DoctorService {
  /** Base API URL for doctors endpoint */
  private readonly apiUrl = `${environment.apiUrl}/v2/configurations/doctors`;

  /**
   * Constructor
   * @param http HttpClient for making HTTP requests
   */
  constructor(private http: HttpClient) {}

  /** Lista médicos con paginación y filtros */
  list(filter: DoctorFilter): Observable<{ content: DoctorResponse[]; totalElements: number }> {
    let params = new HttpParams();

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('status', filter.status);

    params = params
      .set('page', String(filter.page ?? 0))
      .set('size', String(filter.size ?? 10))
      .set(
        'sort',
        `${filter.sortField ?? 'id'},${(filter.sortOrder ?? 1) === 1 ? 'asc' : 'desc'}`
      );

    return this.http.get<{ content: DoctorResponse[]; totalElements: number }>(this.apiUrl, { params });
  }

  /** Obtiene los tipos de matrícula/registro disponibles */
  getRegistrationTypes(): Observable<RegistrationType[]> {
    return this.http.get<RegistrationType[]>(`${this.apiUrl}/registration-types`);
  }
  /** Crea un nuevo médico */
  createDoctor(doctor: DoctorRequest): Observable<number> {
    return this.http.post<number>(this.apiUrl, doctor);
  }

  /** Actualiza un médico existente */
  updateDoctor(id: number, doctor: DoctorRequest): Observable<DoctorResponse> {
    return this.http.put<DoctorResponse>(`${this.apiUrl}/${id}`, doctor);
  }

  /** Actualiza el estado de un médico por ID */
  updateDoctorStatus(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
