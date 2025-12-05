import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppointmentFilters, AppointmentDayPageDto } from '../models';
import { Appointment } from '../models/appointment.model';
import { CreateAppointmentRequest } from '../models/create-appointment.model';


/**
 * Service for managing appointment operations.
 * Handles fetching, creating, and updating appointments.
 */
@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/v1/public-appointments/day`;
  private readonly appointmentsUrl = `${environment.apiUrl}/v1/appointments`;

  /**
   * Constructs the AppointmentService.
   * @param http Angular HTTP client for API requests
   */
  constructor(private http: HttpClient) {
  }

  /**
   * Fetches appointments from the backend using the provided filters.
   * The case converter interceptor automatically handles snake_case to camelCase conversion.
   * @param filters Filter criteria including date, branch, status, and pagination
   * @returns Observable with paginated appointment data
   */
  getAppointments(filters: AppointmentFilters): Observable<AppointmentDayPageDto> {
    let params = new HttpParams();

    if (filters.date) params = params.set('date', filters.date);
    if (filters.branchId !== undefined) params = params.set('branchId', filters.branchId);
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(s => (params = params.append('status', s)));
    }
    if (filters.searchCriteria) params = params.set('searchCriteria', filters.searchCriteria);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.dir) params = params.set('dir', filters.dir);
    if (filters.page !== undefined) params = params.set('page', filters.page);
    if (filters.size !== undefined) params = params.set('size', filters.size);

    return this.http.get<AppointmentDayPageDto>(this.apiUrl, { params });
  }

  /**
   * Updates the status of an existing appointment.
   * @param id Appointment ID to update
   * @param status New status value for the appointment
   * @returns Observable with the updated appointment
   */
  updateAppointmentStatus(id: number, status: string): Observable<Appointment> {
    const body = { status };
    const url = `${environment.apiUrl}/v1/public-appointments/${id}/status`;
    return this.http.patch<Appointment>(url, body);
  }

  /**
   * Creates a new appointment.
   * @param appointmentData Appointment details including patient, branch, slot, determinations, and comments
   * @returns Observable with the created appointment
   */
  createAppointment(
    appointmentData: CreateAppointmentRequest
  ): Observable<Appointment> {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(appointmentData)], { type: 'application/json' })
    );

    return this.http.post<Appointment>(this.appointmentsUrl, formData);
  }
}
