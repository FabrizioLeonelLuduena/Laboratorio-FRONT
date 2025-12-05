import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  StudyListItemDto,
  StudyDetailDto,
  PagedResponseDto,
  StudyFilterRequestDto,
  StudyStatus
} from '../models/models';

/**
 * Service for managing studies with real backend connection
 */
@Injectable({
  providedIn: 'root'
})
export class EstudiosService {
  private readonly apiUrl = `${environment.apiUrl}/v1/studies`;

  /**
   * Constructor
   * @param http - HTTP client
   */
  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of studies with optional filtering
   * @param filterRequest - Filter parameters
   * @returns Observable of paged response with studies
   */
  getStudies(filterRequest: StudyFilterRequestDto): Observable<PagedResponseDto<StudyListItemDto>> {
    let params = new HttpParams()
      .set('page', filterRequest.page.toString())
      .set('size', filterRequest.size.toString())
      .set('sortBy', filterRequest.sortBy)
      .set('sortDirection', filterRequest.sortDirection);

    if (filterRequest.status) {
      params = params.set('status', filterRequest.status);
    }

    if (filterRequest.dateFrom) {
      params = params.set('dateFrom', filterRequest.dateFrom);
    }

    if (filterRequest.dateTo) {
      params = params.set('dateTo', filterRequest.dateTo);
    }

    if (filterRequest.patientName) {
      params = params.set('patientName', filterRequest.patientName);
    }

    if (filterRequest.patientDni) {
      params = params.set('patientDni', filterRequest.patientDni);
    }

    return this.http.get<PagedResponseDto<StudyListItemDto>>(this.apiUrl, { params });
  }

  /**
   * Get detailed information of a specific study by ID
   * @param studyId - Study ID
   * @returns Observable of study detail
   */
  getStudyDetail(studyId: number): Observable<StudyDetailDto> {
    return this.http.get<StudyDetailDto>(`${this.apiUrl}/${studyId}`);
  }

  /**
   * Convert UI filter status to backend StudyStatus enum
   * @param estadoFirma - UI filter status
   * @returns Backend StudyStatus or undefined
   */
  convertStatusFilter(estadoFirma: string): StudyStatus | undefined {
    switch (estadoFirma) {
    case 'No firmada':
      return StudyStatus.PENDING;
    case 'Firmada parcial':
      return StudyStatus.PARTIALLY_SIGNED;
    case 'Firmada total':
      return StudyStatus.CLOSED;
    case 'Lista para firmar':
      return StudyStatus.READY_FOR_SIGNATURE;
    default:
      return undefined;
    }
  }

  /**
   * Convert backend StudyStatus to UI label
   * @param status - Backend status
   * @returns UI label
   */
  getStatusLabel(status: StudyStatus): string {
    switch (status) {
    case StudyStatus.PENDING:
      return 'NO FIRMADA';
    case StudyStatus.PARTIALLY_SIGNED:
      return 'FIRMADA PARCIAL';
    case StudyStatus.READY_FOR_SIGNATURE:
      return 'LISTA PARA FIRMAR';
    case StudyStatus.CLOSED:
      return 'FIRMADA TOTAL';
    default:
      return 'DESCONOCIDO';
    }
  }

  /**
   * Get severity for status badge
   * @param status - Backend status
   * @returns Severity level
   */
  getStatusSeverity(status: StudyStatus): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
    case StudyStatus.CLOSED:
      return 'success';
    case StudyStatus.PARTIALLY_SIGNED:
    case StudyStatus.READY_FOR_SIGNATURE:
      return 'warn';
    case StudyStatus.PENDING:
      return 'danger';
    default:
      return 'info';
    }
  }
}
