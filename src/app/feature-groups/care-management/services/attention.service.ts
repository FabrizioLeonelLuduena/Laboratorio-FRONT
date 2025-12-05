import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { environment } from 'src/environments/environment';

import { AtentionResponse } from '../../billing-collections/components/collector/models/dtos';
import {
  AddAnalysisListRequest,
  AddExtractorNoteToAttentionRequest,
  AddPaymentToAttentionRequest,
  AssignExtractorToAttentionRequest,
  AssignGeneralDataToAttentionRequest,
  AttentionResponse,
  CancelAttentionRequestDto,
  CreateNewAttentionRequest,
  CreatePreFilledAttentionRequest,
  PaymentInfoNeededDto, TicketDto
} from '../models/attention.models';

/**
 * Service for attention workflow operations
 */
@Injectable({ providedIn: 'root' })
export class AttentionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/v1/attentions`;

  /**
   * Get all attentions
   * GET /api/v1/attentions
   */
  getAllAttentions(filters: { excludeStates?: string[]; dateFrom?: string; dateTo?: string; } = {}): Observable<AttentionResponse[]> {
    let params = new HttpParams();

    // Send each state as a separate parameter (backend expects List<String>)
    if (filters.excludeStates && filters.excludeStates.length > 0) {
      filters.excludeStates.forEach(state => {
        params = params.append('excludeStates', state);
      });
    }

    if (filters.dateFrom) {
      params = params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.append('dateTo', filters.dateTo);
    }
    return this.http.get<AttentionResponse[]>(this.baseUrl, { params });
  }

  /**
   * Get an attention by ID
   * GET /api/v1/attentions/{id}
   */
  getAttentionById(id: number): Observable<AttentionResponse> {
    return this.http.get<AttentionResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get payment information for an attention
   */
  get(id: number): Observable<AtentionResponse> {
    return this.http.get<AtentionResponse>(`${this.baseUrl}/${id}/payment`);
  }

  /**
   * Create a new attention pre-filled with appointment data
   * POST /api/v1/attentions/prefilled
   */
  createPreFilledAttention(dto: CreatePreFilledAttentionRequest): Observable<AttentionResponse> {
    return this.http.post<AttentionResponse>(`${this.baseUrl}/prefilled`, dto);
  }

  /**
   * Create a new blank attention
   * POST /api/v1/attentions/new
   */
  createNewAttention(dto: CreateNewAttentionRequest): Observable<AttentionResponse> {
    return this.http.post<AttentionResponse>(`${this.baseUrl}/new`, dto);
  }

  /**
   * Assign patient data, insurance plan, indications and doctor to an attention
   * PATCH /api/v1/attentions/{id}/assign/general-data
   */
  assignGeneralDataToAttention(attentionId: number, dto: AssignGeneralDataToAttentionRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/assign/general-data`, dto);
  }

  /**
   * Add analysis list to an attention
   * PATCH /api/v1/attentions/{id}/add/analysis
   */
  addAnalysisListToAttention(attentionId: number, dto: AddAnalysisListRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/add/analysis`, dto);
  }

  /**
   * Add payment to an attention
   * PATCH /api/v1/attentions/{id}/add/payment
   */
  addPaymentToAttention(attentionId: number, dto: AddPaymentToAttentionRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/add/payment`, dto);
  }

  /**
   * End billing phase of an attention
   * PATCH /api/v1/attentions/{id}/end-billing
   */
  endBillingPhase(attentionId: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/end-billing`, {});
  }

  /**
   * Print the ticket of an attention
   * POST /api/v1/attentions/print
   */
  printAttention(attentionId: number, dto: TicketDto): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/print`, dto, { responseType: 'blob' });
  }

  /**
   * End the secretary phase of an attention process
   * PATCH /api/v1/attentions/{id}/confirm
   */
  endAttentionBySecretaryProcess(attentionId: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/confirm`, {});
  }

  /**
   * 📦 Obtiene todas las atenciones en proceso de extracción
   */
  getInExtraction(): Observable<AttentionResponse[]> {
    return this.http.get<AttentionResponse[]>(`${this.baseUrl}/in-extraction`);
  }

  /**
   * ⏳ Obtiene todas las atenciones en espera de extracción
   */
  getAwaitingExtraction(): Observable<AttentionResponse[]> {
    return this.http.get<AttentionResponse[]>(`${this.baseUrl}/awaiting-extraction`);
  }

  /**
   * Assign an extractor employee to an attention
   * PATCH /api/v1/attentions/{id}/assign/extractor
   */
  assignExtractorToAttention(attentionId: number, dto: AssignExtractorToAttentionRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/assign/extractor`, dto);
  }

  /**
   * Add observations to an attention
   * PATCH /api/v1/attentions/{id}/add/observations
   */
  addObservationsToAttention(attentionId: number, dto: AddExtractorNoteToAttentionRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/add/observations`, dto);
  }

  /**
   * Return an attention to the extraction queue
   * PATCH /api/v1/attentions/{id}/cancel-extraction
   */
  cancelExtractionProcess(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${id}/cancel-extraction`, {});
  }

  /**
   * End the extractor phase of an attention process
   * PATCH /api/v1/attentions/{id}/end
   */
  endAttentionByExtractorProcess(attentionId: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/end`, {});
  }
  /** Creates the protocol that tracks the analysis*/
  createProtocol(attentionId: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/createProtocol`, attentionId);
  }

  /**
   * Get payment information needed for payment process
   * GET /api/v1/attentions/{id}/payment
   */
  getPaymentInfoForAttention(attentionId: number): Observable<PaymentInfoNeededDto> {
    return this.http.get<PaymentInfoNeededDto>(`${this.baseUrl}/${attentionId}/payment`);
  }

  /**
   * Cancel an attention
   * PATCH /api/v1/attentions/{id}/cancel
   */
  cancelAttention(attentionId: number, dto: CancelAttentionRequestDto): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/cancel`, dto);
  }

  /**
   * Reverse an attention to its previous state
   * PATCH /api/v1/attentions/{id}/return
   */
  reverseAttention(attentionId: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.baseUrl}/${attentionId}/return`, {});
  }
}
