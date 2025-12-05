import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Observable, map, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { mapClientListResponseToOptions } from '../mappers/colppy-customers.mapper';
import {
  ClientListResponseDto,
  CreateCustomerMinimalResponse,
  CustomerOption
} from '../view-models/colppy-customer.vm';

import { ErrorHandlingService } from './ErrorHandlingService';

/**
 *
 */
@Injectable({ providedIn: 'root' })
export class ColppyService {
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
  private readonly baseUrl = `${environment.apiUrl}/v1/billing`;



  /** Standard headers for Colppy API requests. */
  createCustomer(payloadColppy: Record<string, any>): Observable<CreateCustomerMinimalResponse> {
    return this.http
      .post<CreateCustomerMinimalResponse>(`${this.baseUrl}/invoices/customers`, payloadColppy)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Gets all customers from Colppy with pagination.
   *
   * @param params - Optional pagination parameters: start index and limit.
   * @returns An observable emitting an array of CustomerOption objects.
   */
  getAllCustomers(params?: { start?: number; limit?: number }): Observable<CustomerOption[]> {
    this._isLoading.set(true);
    this._error.set(null);

    const start = params?.start ?? 0;
    const limit = params?.limit ?? 100;

    const url = `${this.baseUrl}/invoices/customers`;
    const httpParams = new HttpParams()
      .set('start', start.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ClientListResponseDto>(url, { params: httpParams })
      .pipe(
        map(mapClientListResponseToOptions),
        tap(() => this._isLoading.set(false)),
        catchError(error => {
          const appError = this.errorHandlingService.captureHttpError(error, {
            operation: 'getAllCustomers',
            data: { start, limit }
          });
          this._error.set(appError.message);
          return throwError(() => error);
        })
      );
  }


}
