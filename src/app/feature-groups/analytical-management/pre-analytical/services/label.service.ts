import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment.production';
import {
  LabelDTO,
  LabelReprintRequestDTO,
  LabelResponseDTO,
  LabelStatus,
  LabelStatusUpdateRequestDTO,
  LabelWithAnalysisInfoDTO,
  PatientNameDTO,
  SendToBranchRequestDTO
} from '../models/label.interface';

/**
 * Service for handling label-related operations in the pre-analytical module.
 * Provides methods for retrieving and updating label information.
 */
@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;

  /**
   * Retrieves all labels from the system.
   * @returns Observable containing array of all labels
   */
  getAllLabels(): Observable<LabelDTO[]> {
    return this.http.get<LabelDTO[]>(`${this.apiUrl}/labels`);
  }

  /**
   * Retrieves all active labels.
   * @returns Observable containing array of active labels
   */
  getAllActiveLabels(): Observable<LabelDTO[]> {
    return this.http.get<LabelDTO[]>(`${this.apiUrl}/labels/active`);
  }

  /**
   * Retrieves a specific label by ID.
   * @param id - The label identifier
   * @returns Observable containing the label data
   */
  getLabelById(id: number): Observable<LabelDTO> {
    return this.http.get<LabelDTO>(`${this.apiUrl}/labels/${id}`);
  }

  /**
   * Retrieves labels by protocol with enriched analysis information.
   * Returns labels with label configuration name, NBU analysis name, and print status.
   * @param protocolId - The protocol identifier
   * @param status - Optional status filter
   * @returns Observable containing array of labels with analysis information
   */
  getLabelsByProtocolAndStatus(protocolId: number, status?: LabelStatus
  ): Observable<LabelWithAnalysisInfoDTO[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<LabelWithAnalysisInfoDTO[]>(`${this.apiUrl}/labels/protocol/${protocolId}/filter`, {
      params
    });
  }

  /**
   * Retrieves all labels with a specific status.
   * @param status - The label status to filter by
   * @returns Observable containing array of labels with that status
   */
  getLabelsByStatus(status: LabelStatus): Observable<LabelResponseDTO[]> {
    return this.http.get<LabelResponseDTO[]>(`${this.apiUrl}/labels/status/${status}`);
  }

  /**
   * Updates the status of multiple labels in a single operation.
   * Used for batch check-in when registering labels from the cart.
   * @param labelIds - Array of label IDs to update
   * @param newStatus - The new status to apply (COLLECTED or IN_TRANSIT)
   * @returns Observable containing updated labels
   */
  updateLabelsStatus(
    labelIds: number[],
    newStatus: LabelStatus
  ): Observable<LabelDTO[]> {
    const request: LabelStatusUpdateRequestDTO = {
      labelIds,
      newStatus
    };
    return this.http.put<LabelDTO[]>(`${this.apiUrl}/labels/status`, request);
  }

  /**
   * Rolls back the status of multiple labels to a previous state.
   * This method bypasses forward-only transition validation and allows
   * reverting labels to a previous status in the workflow.
   * @param labelIds - Array of label IDs to rollback
   * @param previousStatus - The previous status to revert to
   * @returns Observable containing updated labels
   */
  rollbackLabelsStatus(
    labelIds: number[],
    previousStatus: LabelStatus
  ): Observable<LabelDTO[]> {
    const request: LabelStatusUpdateRequestDTO = {
      labelIds,
      newStatus: previousStatus
    };
    return this.http.patch<LabelDTO[]>(`${this.apiUrl}/labels/status/rollback`, request);
  }

  /**
   * Retrieves patient name associated with a protocol.
   * @param protocolId - The protocol identifier
   * @returns Observable containing patient name information
   */
  getPatientNameByProtocolId(protocolId: number): Observable<PatientNameDTO> {
    return this.http.get<PatientNameDTO>(`${this.apiUrl}/labels/protocol/${protocolId}/patient-name`);
  }

  /**
   * Reprints selected labels.
   * @param request - Request containing array of label IDs to reprint
   * @returns Observable that completes when reprint is successful
   */
  reprintLabels(request: LabelReprintRequestDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/labels/reprint`, request);
  }

  /**
   * Marks a label and its associated sample as lost.
   * Only labels in DERIVED status can be marked as lost.
   * @param labelId - The label ID to mark as lost
   * @param reason - Description of why the label was lost
   * @param userId - User ID of the person reporting the loss
   * @returns Observable that completes when operation is successful
   */
  markLabelAsLost(labelId: number, reason: string, userId: number): Observable<void> {
    const params = new HttpParams().set('reason', reason);
    const headers = { 'x-user-id': userId.toString() };
    return this.http.post<void>(
      `${this.apiUrl}/labels/lost/${labelId}`,
      null,
      { params, headers }
    );
  }

  /**
   * Updates the destination branch for a derived label.
   * This is used when a sample needs to be sent to another branch.
   * @param labelId - The label ID to update
   * @param destinationBranchId - The destination branch ID
   * @returns Observable that completes when operation is successful
   */
  updateDestinationBranch(labelId: number, destinationBranchId: number): Observable<void> {
    const params = new HttpParams().set('destinationBranchId', destinationBranchId.toString());
    return this.http.patch<void>(
      `${this.apiUrl}/labels/${labelId}/destination-branch`,
      null,
      { params }
    );
  }

  /**
   * Sends a label to a destination branch.
   * This endpoint is used when sending samples to another branch for processing.
   * @param labelId - The label ID to send
   * @param destinationBranchId - The destination branch ID
   * @param reason - Reason for sending to branch
   * @param notes - Optional additional notes
   * @returns Observable that completes when operation is successful
   */
  sendToBranch(labelId: number, destinationBranchId: number, reason: string, notes: string): Observable<void> {
    const request: SendToBranchRequestDTO = {
      labelId,
      destinationBranchId,
      reason,
      notes
    };
    return this.http.post<void>(`${this.apiUrl}/labels/send-to-branch`, request);
  }

}
