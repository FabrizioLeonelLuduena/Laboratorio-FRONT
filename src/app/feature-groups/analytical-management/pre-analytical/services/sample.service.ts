import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment.production';
import { PagedResponse, CancelLabelsResponseDTO, DiscardLabelsRequestDTO, DiscardLabelsResponseDTO, LabelCancelRequestDTO, LabelRejectRequestDTO, LabelResponseDTO, LabelStatus, LabelStatusUpdateRequestDTO, RejectLabelsResponseDTO } from '../models/label.interface';

/**
 * Service for managing sample data.
 * Provides methods to retrieve samples in different states:
 * - COLLECTED: Samples that have been collected
 * - IN_PREPARATION: Samples being prepared for analysis
 * - IN_TRANSIT: Samples in transport with extended tracking info
 * - DERIVED: Samples in derivation process
 */
@Injectable({
  providedIn: 'root'
})
export class SampleService {
  private readonly apiUrl = `${environment.apiUrl}/v1/labels`;

  /**
   * Constructor
   * @param http - HTTP client for API calls
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves samples by status from backend
   * @param status - The label status to filter by
   * @param areaId - Optional area ID filter
   * @param sectionId - Optional section ID filter
   * @param dateFrom - Optional start date filter (yyyy-MM-dd)
   * @param dateTo - Optional end date filter (yyyy-MM-dd)
   * @returns Observable of LabelResponseDTO array
   */
  getSamplesByStatus(
    status: LabelStatus,
    areaId?: number,
    sectionId?: number,
    dateFrom?: string,
    dateTo?: string,
    page?: number,
    size?: number
  ): Observable<PagedResponse> {
    let params = new HttpParams();

    if (areaId !== undefined) {
      params = params.set('areaId', areaId.toString());
    }

    if (sectionId !== undefined) {
      params = params.set('sectionId', sectionId.toString());
    }

    if (dateFrom) {
      params = params.set('from', dateFrom);
    }

    if (dateTo) {
      params = params.set('to', dateTo);
    }

    if (page !== undefined) {
      params = params.set('page', page.toString());
    }

    if (size !== undefined) {
      params = params.set('size', size.toString());
    }

    return this.http.get<PagedResponse>(`${this.apiUrl}/status/${status}`, { params });
  }

  /**
   * Retrieves collected samples (status: COLLECTED)
   * @param areaId - Optional area ID filter
   * @param sectionId - Optional section ID filter
   * @param dateFrom - Optional start date filter (yyyy-MM-dd)
   * @param dateTo - Optional end date filter (yyyy-MM-dd)
   * @returns Observable of LabelResponseDTO array
   */
  getCollectedSamples(areaId?: number, sectionId?: number, dateFrom?: string, dateTo?: string, page?: number, size?: number): Observable<PagedResponse> {
    return this.getSamplesByStatus(LabelStatus.COLLECTED, areaId, sectionId, dateFrom, dateTo, page, size);
  }

  /**
   * Retrieves samples in preparation (status: IN_PREPARATION)
   * @param areaId - Optional area ID filter
   * @param sectionId - Optional section ID filter
   * @param dateFrom - Optional start date filter (yyyy-MM-dd)
   * @param dateTo - Optional end date filter (yyyy-MM-dd)
   * @returns Observable of LabelResponseDTO array
   */
  getPreparatedSamples(areaId?: number, sectionId?: number, dateFrom?: string, dateTo?: string, page?: number, size?: number): Observable<PagedResponse> {
    return this.getSamplesByStatus(LabelStatus.IN_PREPARATION, areaId, sectionId, dateFrom, dateTo, page, size);
  }

  /**
   * Retrieves samples in transit (status: IN_TRANSIT)
   * @param areaId - Optional area ID filter
   * @param sectionId - Optional section ID filter
   * @param dateFrom - Optional start date filter (yyyy-MM-dd)
   * @param dateTo - Optional end date filter (yyyy-MM-dd)
   * @returns Observable of LabelResponseDTO array
   */
  getTransportedSamples(areaId?: number, sectionId?: number, dateFrom?: string, dateTo?: string, page?: number, size?: number): Observable<PagedResponse> {
    return this.getSamplesByStatus(LabelStatus.IN_TRANSIT, areaId, sectionId, dateFrom, dateTo, page, size);
  }

  /**
   * Retrieves derived samples (status: DERIVED)
   * @param areaId - Optional area ID filter
   * @param sectionId - Optional section ID filter
   * @param dateFrom - Optional start date filter (yyyy-MM-dd)
   * @param dateTo - Optional end date filter (yyyy-MM-dd)
   * @returns Observable of LabelResponseDTO array
   */
  getDerivedSamples(areaId?: number, sectionId?: number, dateFrom?: string, dateTo?: string, page?: number, size?: number): Observable<PagedResponse> {
    return this.getSamplesByStatus(LabelStatus.DERIVED, areaId, sectionId, dateFrom, dateTo, page, size);
  }

  /**
   * Updates the status of multiple labels
   * @param labelIds - Array of label IDs to update
   * @param newStatus - The new status to apply
   * @param reason - Optional reason for the status change (required for CANCELED/REJECTED)
   * @returns Observable of updated LabelResponseDTO array
   */
  updateLabelsStatus(labelIds: number[], newStatus: LabelStatus, reason?: string): Observable<LabelResponseDTO[]> {
    const request: LabelStatusUpdateRequestDTO = {
      labelIds,
      newStatus,
      ...(reason && { reason })
    };
    return this.http.put<LabelResponseDTO[]>(`${this.apiUrl}/status`, request);
  }

  /**
   * Rolls back the status of multiple labels to a previous state.
   * This method bypasses forward-only transition validation and allows
   * reverting labels to a previous status in the workflow.
   * @param labelIds - Array of label IDs to rollback
   * @param previousStatus - The previous status to revert to
   * @param reason - Optional reason for the rollback
   * @returns Observable of updated LabelResponseDTO array
   */
  rollbackLabelsStatus(labelIds: number[], previousStatus: LabelStatus, reason?: string): Observable<LabelResponseDTO[]> {
    const request: LabelStatusUpdateRequestDTO = {
      labelIds,
      newStatus: previousStatus,
      ...(reason && { reason })
    };
    return this.http.patch<LabelResponseDTO[]>(`${this.apiUrl}/status/rollback`, request);
  }

  /**
   * Cancels multiple labels with a cancellation reason
   * @param labelIds - Array of label IDs to cancel
   * @param reason - Reason for cancellation (required, 10-500 characters)
   * @returns Observable of CancelLabelsResponseDTO with canceled label IDs
   */
  cancelLabels(labelIds: number[], reason: string): Observable<CancelLabelsResponseDTO> {
    const request: LabelCancelRequestDTO = {
      labelIds,
      reason
    };
    return this.http.post<CancelLabelsResponseDTO>(`${this.apiUrl}/cancel`, request);
  }

  /**
   * Rejects multiple labels with a rejection reason
   * @param labelIds - Array of label IDs to reject
   * @param reason - Reason for rejection (required, 10-500 characters)
   * @returns Observable of RejectLabelsResponseDTO with rejected label IDs
   */
  rejectLabels(labelIds: number[], reason: string): Observable<RejectLabelsResponseDTO> {
    const request: LabelRejectRequestDTO = {
      labelIds,
      reason
    };
    return this.http.post<RejectLabelsResponseDTO>(`${this.apiUrl}/reject`, request);
  }

  /**
   * Discards multiple labels (marks them as physically discarded)
   * @param labelIds - Array of label IDs to discard
   * @returns Observable of DiscardLabelsResponseDTO with discarded label IDs
   */
  discardLabels(labelIds: number[]): Observable<DiscardLabelsResponseDTO> {
    const request: DiscardLabelsRequestDTO = {
      labelIds
    };
    return this.http.patch<DiscardLabelsResponseDTO>(`${this.apiUrl}/discard`, request);
  }

  /**
   * Retrieves labels by section ID
   * @param sectionId - The section ID to filter by
   * @returns Observable of LabelResponseDTO array
   */
  getLabelsBySection(sectionId: number): Observable<LabelResponseDTO[]> {
    return this.http.get<LabelResponseDTO[]>(`${this.apiUrl}/section/${sectionId}`);
  }

  /**
   * Rolls back sample status to a previous valid state
   * @param _protocolId - The protocol ID (unused, kept for API compatibility)
   * @param labelId - The label ID
   * @param previousStatus - The previous status to rollback to
   * @param _userId - The user ID performing the rollback (unused, kept for API compatibility)
   * @returns Observable that completes when rollback is successful
   */
  rollbackSampleStatus(_protocolId: number, labelId: number, previousStatus: LabelStatus, _userId: number): Observable<any> {
    return this.rollbackLabelsStatus([labelId], previousStatus);
  }
}
