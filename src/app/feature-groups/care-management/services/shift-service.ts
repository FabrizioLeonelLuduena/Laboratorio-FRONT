import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';

import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  AttentionBlankRequestDTO,
  AttentionFromShiftRequestDTO,
  AttentionShift,
  AttentionShiftResponseDTO
} from '../models/attention-shift';
import { AttentionResponse } from '../models/attention.models';

/**
 * Service for attention shift operations
 */
@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly attentionUrl = `${environment.apiUrl}/v1/attentions`;

  /**
   * Builds headers with xUserId for attention creation endpoints
   */
  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const user = this.authService.getUser();

    if (user?.id) {
      headers = headers.set('xUserId', String(user.id));
    }

    return headers;
  }

  /**
   * Get all attentions and map them to AttentionShift format
   * GET /api/v1/attentions
   *
   * Note: The backend returns AttentionResponse objects.
   * Since the backend doesn't include patient DNI directly, we show patient_id temporarily.
   * TODO: Update backend to include patient DNI or fetch patient data separately.
   */
  getAllShifts(): Observable<AttentionShift[]> {
    return this.http.get<AttentionResponse[]>(this.attentionUrl).pipe(
      map((attentions: AttentionResponse[]) => {
        return attentions.map((attention) => ({
          nro: attention.attentionNumber,
          document: attention.patientId || 0, // Using patient_id temporarily until backend provides DNI
          dateTime: attention.admissionDate || new Date().toISOString(),
          appointmentId: 0, // Attentions don't have appointment_id in the response
          hasData: !!attention.patientId, // Has data if patient is assigned
          hasShift: false, // Attentions created from appointments would have this as true
          branchId: attention.branchId // Include branch_id for filtering
        } as AttentionShift));
      }),
      catchError((err) => {
        // Propagar el error al componente consumidor para que maneje la UI
        return throwError(() => err);
      })
    );
  }

  /**
   * POST create attention with prefilled data mock
   * Creates attention with prefilled data from appointment
   * @param dto Appointment data
   * @returns Observable with created attention response
   */
  createAttentionPrefilled(dto: AttentionFromShiftRequestDTO): Observable<AttentionShiftResponseDTO> {
    const url = `${this.attentionUrl}/prefilled`;
    const headers = this.buildHeaders();

    return this.http.post<AttentionShiftResponseDTO>(url, dto, { headers }).pipe(
      catchError((err) => {
        // Propagar el error al componente consumidor para que maneje la UI
        return throwError(() => err);
      })
    );
  }

  /**
   * Creates blank attention without appointment
   * @param dto Blank attention data
   * @returns Observable with created attention response
   */
  createAttentionEmpty(dto: AttentionBlankRequestDTO): Observable<AttentionShiftResponseDTO> {
    const url = `${this.attentionUrl}/new`;
    const headers = this.buildHeaders();

    return this.http.post<AttentionShiftResponseDTO>(url, dto, { headers }).pipe(
      catchError((err) => {
        // Propagar el error al componente consumidor para que maneje la UI
        return throwError(() => err);
      })
    );
  }

}
