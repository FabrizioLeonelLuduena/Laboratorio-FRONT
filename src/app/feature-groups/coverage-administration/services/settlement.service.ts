import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  SettlementCompleteResponseDTO,
  SettlementCreateRequestDTO,
  SettlementPreviewRequestDTO,
  SettlementResponseDTO
} from '../models/settlement.model';

/**
 * Settlement Service
 * Handles retrieval and creation of settlements and related data.
 * All comments and documentation are in English as requested.
 */
@Injectable({ providedIn: 'root' })
export class SettlementService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/settlement`;
  private readonly API_URL_EXEL = `${this.baseApiUrl}/coverages/excel`;


  /**
   *  constructor for SettlementService.
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves all settlements, optionally filtered by insurer and date range.
   */
  getAllSettlements(
    insurerId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Observable<SettlementCompleteResponseDTO[]> {
    let params = new HttpParams();

    if (insurerId != null) params = params.set('insurerId', insurerId.toString());
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);

    return this.http.get<SettlementCompleteResponseDTO[]>(this.API_URL, {
      params
    });
  }

  /**
   * Generates a preview of a settlement (not persisted).
   * @param request Settlement request payload
   */
  previewSettlement(
    request: SettlementPreviewRequestDTO
  ): Observable<SettlementCompleteResponseDTO> {
    return this.http.post<SettlementCompleteResponseDTO>(
      `${this.API_URL}/preview`,
      request
    );
  }

  /**
   * Creates and persists a settlement.
   * @param request Settlement request payload
   * @return A complete settlement response DTO of the created settlement.
   * @Operation(
   *     summary = "Create settlement",
   *     description = "Creates and persists a new settlement with the provided data."
   * )
   * @ApiResponses(value = {
   *     @ApiResponse(responseCode = "201", description = "Settlement created successfully",
   *             content = @Content(schema = @Schema(implementation = SettlementCompleteResponseDTO.class))),
   *     @ApiResponse(responseCode = BAD_REQUEST_CODE, description = "Validation or mapping error",
   *             content = @Content(schema = @Schema(implementation = ErrorApi.class))),
   *     @ApiResponse(responseCode = INTERNAL_ERROR_CODE, description = INTERNAL_ERROR_MSG,
   *             content = @Content(schema = @Schema(implementation = ErrorApi.class)))
   * })
   */
  createSettlement(
    request: SettlementCreateRequestDTO
  ): Observable<SettlementCompleteResponseDTO> {
    return this.http.post<SettlementCompleteResponseDTO>(
      this.API_URL,
      request
    );
  }

  /**
   * Download the Settlement Excel.
   * @param settlementId ID de la liquidación
   */
  downloadSettlementExcel(settlementId: number): Observable<Blob> {
    const url = `${this.API_URL_EXEL}/settlement/${settlementId}`;
    return this.http.get(url, {
      responseType: 'blob'
    });
  }

  /**
   * Inform a Settlement (Pending to INFORMED)
   */
  informSettlement(settlementId: number,
    informedAmount: number,
    informedDate: string,
    observations: string): Observable<SettlementResponseDTO> {
    const body = {
      id: settlementId,
      informedDate,
      observations,
      informedAmount
    };
    return this.http.put<SettlementResponseDTO>(
      `${this.API_URL}/inform`, body
    );
  }

  /**
   * Cancel (annul) a Settlement
   * Moves status to CANCEL
   */
  cancelSettlement(
    settlementId: number, observations: string
  ): Observable<SettlementResponseDTO> {
    const body = {
      id: settlementId,
      observations: observations
    };

    return this.http.put<SettlementResponseDTO>(
      `${this.API_URL}/cancel`,
      body
    );
  }

  /**
   * Mark a liquidation as collected (paid)
   * Sends liquidationId + transactionId to Coverage service
   */
  markLiquidationAsCollected(liquidationId: number, transactionId: number) {
    const body = {
      liquidation_id: liquidationId,
      transaction_id: transactionId
    };

    return this.http.patch(
      `${environment.apiUrl}/v1/liquidations/collect`,
      body
    );
  }


}
