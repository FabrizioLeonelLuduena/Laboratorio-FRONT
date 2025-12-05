import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { delay } from 'rxjs/operators';

import { PaymentRequestDTO, PaymentResponseDTO } from '../models/dtos';

/**
 * CollectorService - Service for payment collection operations
 */
@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  /**
   * Variable to simulate payment ID generation in mock responses
   * @private
   */
  private readonly BASE_URL = `${environment.apiUrl}/v1`;

  /**
   * Constructor for CollectorService
   * @param http
   */
  constructor(private http: HttpClient) { }

  /**
   * Create a payment with multiple collections
   * @param paymentRequest Payment request with attention ID, details, and collections
   * @returns Single payment response from the backend
   */
  createPayment(paymentRequest: PaymentRequestDTO): Observable<PaymentResponseDTO> {
    const url = `${this.BASE_URL}/payments`;
    return this.http.post<PaymentResponseDTO>(url, paymentRequest);
  }

  /**
   * Complete a collection by payment ID
   * @param _paymentId Payment ID to complete
   * @returns Response with status
   */
  completeCollection(_paymentId: number): Observable<{ status: string }> {
    const response = { status: 'Éxito' };
    return of(response).pipe(delay(800));
  }
}
