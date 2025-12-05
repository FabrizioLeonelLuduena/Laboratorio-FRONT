import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  DeliveryNoteFiltersDTO, DeliveryNoteUpdateDTO,
  RequestDeliveryNoteDTO, ResponseDeliveryNoteDTO,
  ReturnDeliveryNoteDTO
} from '../../models/goods-receipts/goods-receipts.models';
import { CreateReturnRequestDTO, CreateReturnResponseDTO } from '../../models/returns/returns.models';
import { PageResponse } from '../../shared/utils/pagination';


/**
 * Service for managing goods receipts (delivery notes) and returns
 */
@Injectable({ providedIn: 'root' })
export class GoodsReceiptsService {
  private readonly http = inject(HttpClient);
  // Use the backend delivery-notes endpoint (matches: GET /api/v1/delivery-notes/{id})
  private readonly baseUrl = `${environment.apiUrl}/v1/stock/delivery-notes`;
  private readonly returnsUrl = `${environment.apiUrl}/v1/stock/returns`;

  /**
   * Creates a new goods receipt
   * @param dto - Receipt data to create
   * @returns Observable with creation response
   */
  create(dto: RequestDeliveryNoteDTO): Observable<ResponseDeliveryNoteDTO> {
    return this.http.post<ResponseDeliveryNoteDTO>(`${this.baseUrl}`, dto);
  }

  /**
   * Searches goods receipts with filters
   * @param f - Search filters for receipts
   * @returns Observable with results page
   */
  search(f: DeliveryNoteFiltersDTO): Observable<PageResponse<ResponseDeliveryNoteDTO>> {
    let params = new HttpParams();

    if (f) {
      // Pagination
      if (f.page !== undefined) {
        params = params.set('page', f.page.toString());
      }
      if (f.size !== undefined) {
        params = params.set('size', f.size.toString());
      }

      // Sort and direction separated (according to backend spec)
      if (f.sort) {
        // Extract direction if it comes in "field,direction" format
        const sortParts = f.sort.split(',');
        if (sortParts.length > 1) {
          params = params.set('sort', sortParts[0]);
          params = params.set('direction', sortParts[1].toUpperCase());
        } else {
          params = params.set('sort', f.sort);
          params = params.set('direction', 'DESC');
        }
      }

      // If no sort defined, use receiptDate as default
      if (!params.has('sort')) {
        params = params.set('sort', 'receiptDate');
        params = params.set('direction', 'DESC');
      }

      // Specific filters
      if (f.status) {
        params = params.set('status', f.status);
      }
      if (f.supplierId !== undefined) {
        params = params.set('supplierId', f.supplierId.toString());
      }
      if (f.isActive !== undefined) {
        params = params.set('isActive', f.isActive.toString());
      }
      if (f.exitType) {
        params = params.set('exitType', f.exitType);
      }
      if (f.dateFrom) {
        params = params.set('dateFrom', f.dateFrom);
      }
      if (f.dateTo) {
        params = params.set('dateTo', f.dateTo);
      }
      if (f.searchTerm && f.searchTerm.trim()) {
        params = params.set('searchTerm', f.searchTerm.trim());
      }
    }

    return this.http.get<PageResponse<ResponseDeliveryNoteDTO>>(`${this.baseUrl}`, { params });
  }

  /**
   * Gets a goods receipt by ID
   * @param id - Receipt ID
   * @returns Observable with receipt data
   */
  getById(id: number): Observable<ResponseDeliveryNoteDTO> {
    return this.http.get<ResponseDeliveryNoteDTO>(`${this.baseUrl}/${id}`);
  }

  /**
   * Updates a goods receipt
   * @param id - Delivery note ID to update
   * @param dto - Update data
   * @returns Observable with updated response
   */
  update(id: number, dto: DeliveryNoteUpdateDTO): Observable<ResponseDeliveryNoteDTO> {
    return this.http.put<ResponseDeliveryNoteDTO>(`${this.baseUrl}/${id}`, dto);
  }


  /**
   * Creates a product return
   * @param dto - Return data to create
   * @returns Observable with creation response
   */
  createReturn(dto: CreateReturnRequestDTO): Observable<CreateReturnResponseDTO> {
    return this.http.post<CreateReturnResponseDTO>(this.returnsUrl, dto);
  }

  /**
   * Marks a delivery note as received (changes status to RECEIVED)
   * @param id - Delivery note ID to receive
   * @returns Observable with updated response
   */
  receiveDeliveryNote(id: number): Observable<ResponseDeliveryNoteDTO> {
    return this.http.put<ResponseDeliveryNoteDTO>(`${this.baseUrl}/${id}`, { status: 'RECEIVED' });
  }


  /**
   * Cancels a transfer (POST /api/delivery-notes/{id}/cancel)
   * Only for internal transfers (TRANSFER) in PENDING state
   * @param id - Delivery note ID
   * @param userId - User ID
   * @returns Observable with cancellation response
   */
  cancelTransfer(id: number, userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/cancel`, { userId });
  }

  /**
   * Confirms a transfer (POST /api/delivery-notes/{id}/confirm)
   * Only for internal transfers (TRANSFER) in RECEIVED state
   * @param id - Delivery note ID
   * @param userId - User ID
   * @returns Observable with confirmation response
   */
  confirmTransfer(id: number, userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/confirm`, { userId });
  }

  /**
   * Returns merchandise to supplier (POST /api/delivery-notes/{id}/return)
   * Only for EXTERNAL delivery notes (PURCHASE) in RECEIVED status
   * @param id - Delivery note ID
   * @param dto - Return details
   * @returns Observable with return response including status, percentages, and detailed items
   */
  returnMerchandise(id: number, dto: ReturnDeliveryNoteDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/return`, dto);
  }

  /**
   * Returns an internal delivery note (POST /api/delivery-notes/{id}/return-internal)
   * Only for INTERNAL delivery notes (TRANSFER) in RECEIVED status
   * Creates a reverse transfer and new delivery note in PENDING status
   * @param id - Delivery note ID
   * @param dto - Return details
   * @returns Observable with return response including original note, reverse transfer, and new delivery note
   */
  returnInternalDeliveryNote(id: number, dto: ReturnDeliveryNoteDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/return-internal`, dto);
  }
}
