import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Observable, map, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  PaymentView,
  PaymentViewDto,
  mapPaymentViewDtoToModel,
  PaymentResponse,
  PaymentResponseDto,
  mapPaymentResponseDto
} from '../dto/response/payment-view.models';

import { ErrorHandlingService } from './ErrorHandlingService';


/**
 * PaymentsService
 *
 * Provides methods to interact with the backend API for payment operations,
 * including individual payment processing, session payments retrieval,
 * detailed reports, summaries, and export functionality.
 *
 * All HTTP requests include lightweight mock headers when using development mode.
 */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  /** Angular HttpClient used to communicate with backend endpoints. */
  private readonly http = inject(HttpClient);

  /** Custom service used for centralized error capturing and user feedback. */
  private readonly errorHandlingService = inject(ErrorHandlingService);

  /** Reactive signal tracking whether a request is in progress. */
  private _isLoading = signal<boolean>(false);

  /** Reactive signal storing the most recent error message, if any. */
  private _error = signal<string | null>(null);

  /** Readonly reactive state for loading status. */
  readonly isLoading = this._isLoading.asReadonly();

  /** Readonly reactive state for the last captured error message. */
  readonly error = this._error.asReadonly();

  /** Base URL for all payment-related endpoints. */
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  /**
   * Retrieves a detailed payment view for a given attention and cash session.
   *
   * @param params Object containing `attentionId` and `sessionId` identifiers.
   * @returns An observable emitting the mapped `PaymentView` model.
   */
  getPaymentView(params: { attentionId: number; sessionId: number }): Observable<PaymentView> {
    this._isLoading.set(true);
    this._error.set(null);

    const httpParams = new HttpParams()
      .set('attention_id', params.attentionId.toString())
      .set('session_id', params.sessionId.toString());

    return this.http
      .get<PaymentViewDto>(this.baseUrl, { params: httpParams })
      .pipe(
        map(mapPaymentViewDtoToModel),
        tap(() => this._isLoading.set(false)),
        catchError(error => {
          const appError = this.errorHandlingService.captureHttpError(error, {
            operation: 'getPaymentView',
            data: params
          });
          this._error.set(appError.message);
          return throwError(() => error);
        })
      );
  }

  /**
   * Processes a new payment transaction.
   *
   * @param request Object containing payment details (method, amount, session and attention IDs).
   * @returns An observable emitting the processed `PaymentResponse`.
   */
  processPayment(request: {
    paymentMethod: string;
    amount: number;
    sessionId: number;
    attentionId: number;
  }): Observable<PaymentResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    const dto = {
      paymentMethod: request.paymentMethod,
      amount: request.amount,
      attentionId: request.attentionId,
      sessionId: request.sessionId
    };

    return this.http
      .post<PaymentResponseDto>(`${this.baseUrl}/payments/cash`, dto)
      .pipe(
        map(mapPaymentResponseDto),
        tap(() => this._isLoading.set(false)),
        catchError(error => {
          const appError = this.errorHandlingService.captureHttpError(error, {
            operation: 'processPayment',
            data: request
          });
          this._error.set(appError.message);
          return throwError(() => error);
        })
      );
  }

  /**
   * Retrieves all payments registered under a specific cash session.
   *
   * @param sessionId The identifier of the open or closed cash session.
   * @returns An observable emitting an array of session payments.
   */
  getPaymentsBySession(sessionId: number): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/session/${sessionId}`)
      .pipe(
        catchError(error => {
          const appError = this.errorHandlingService.captureHttpError(error, {
            operation: 'getPaymentsBySession',
            data: sessionId
          });
          this._error.set(appError.message);
          return throwError(() => error);
        })
      );
  }


}
