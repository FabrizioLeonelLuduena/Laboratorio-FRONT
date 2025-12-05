import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  QueueRequestDto,
  QueueResponseDto,
  PageResponse,
  QueueUpdateDto,
  QueueStatusEnum,
  QueuePatientFullDataDto,
  QueueCompletedDto
} from '../models/queue.models';

/**
 * Service for managing patient queue operations
 */
@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private readonly baseUrl = `${environment.apiUrl}/v1/queue`;

  /**
   * Constructor for QueueService
   */
  constructor(private http: HttpClient) {}

  /**
   * Creates a new queue entry for a patient
   * @param request Patient data (DNI, branch, has appointment)
   * @returns Observable with the public code response
   */
  createQueueEntry(request: QueueRequestDto): Observable<string> {
    const payload = {
      national_id: request.nationalId,
      branch_id: request.branchId,
      has_appointment: request.hasAppointment
    };

    return this.http.post(this.baseUrl, payload, { responseType: 'text' });
  }

  /**
   * Gets paginated queue for a branch
   * @param branchId Branch identifier
   * @param page Page number (1-based)
   * @returns Observable with paginated queue response whit status
   */
  getQueue(branchId: number, page: number = 1): Observable<PageResponse<QueueResponseDto>> {
    const params = new HttpParams()
      .set('branchId', branchId.toString())
      .set('page', page.toString());

    return this.http.get<PageResponse<QueueResponseDto>>(this.baseUrl, { params });
  }

  /**
   * Gets available queue statuses
   * @returns Observable with status list
   */
  getAvailableStatuses(): Observable<QueueStatusEnum[]> {
    return this.http.get<QueueStatusEnum[]>(`${this.baseUrl}/statuses`);
  }

  /**
   * Updates queue entry status
   * @param updateDto Status update data
   * @returns Observable with updated queue entry
   */
  updateQueueStatus(updateDto: QueueUpdateDto): Observable<QueueResponseDto> {
    return this.http.patch<QueueResponseDto>(`${this.baseUrl}/status`, updateDto);
  }

  /**
   * Gets complete patient data by public code
   * Includes: queue data, patient data, appointment and determinations
   * @param publicCode Patient's public code
   * @returns Observable with complete patient data
   */
  getPatientByPublicCode(publicCode: string): Observable<QueuePatientFullDataDto> {
    const authUser = localStorage.getItem('auth_user');
    const branchId = authUser ? JSON.parse(authUser).branch : null;

    const params = branchId
      ? new HttpParams().set('branchId', branchId.toString())
      : new HttpParams();

    return this.http.get<any>(`${this.baseUrl}/patient/${publicCode}`, { params }).pipe(
      map(response => ({
        queueResponseDto: response.queueResponseDto,
        patientData: response.patientData,
        appointmentResponseDto: response.appointmentResponseDto,
        analysisDTO: response.analysisDto || response.analysisDTO
      }))
    );
  }

  /**
   * Gets paginated completed queue for a branch
   * @param branchId Branch identifier
   * @param page Page number (1-based)
   * @param date Date filter (yyyy-MM-dd). Defaults to today if not provided
   * @returns Observable with paginated completed queue response
   */
  getCompletedQueue(
    branchId: number,
    page: number = 1,
    date?: string
  ): Observable<PageResponse<QueueCompletedDto>> {
    let params = new HttpParams()
      .set('branchId', branchId.toString())
      .set('page', page.toString());

    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<PageResponse<QueueCompletedDto>>(`${this.baseUrl}/completed`, { params });
  }
}
