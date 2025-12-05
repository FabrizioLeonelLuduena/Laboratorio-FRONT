import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { catchError, finalize, map, Observable, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { InvoiceableFilter } from '../domain/invoiceable-filter.model';
import { InvoiceableType } from '../domain/invoiceable-type.enum';
import { Invoiceable } from '../domain/invoiceable.model';

/**
 * Spring Page response structure from backend
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/**
 * Backend DTO for InvoiceableDTO
 */
interface InvoiceableDTO {
  id: number;
  type: InvoiceableType;
  date: string;
  description: string;
  amount: number;
    invoiceReference?: {
    invoiceReferenceId: number;
    invoiceReference: string;
    invoiceableId: number;
      invoiceData?: unknown;
  };
}

/**
 * Response returned when retrying invoice generation.
 */
interface RetryInvoiceResponse {
  success: boolean;
  message?: string;
}

/**
 * Service for managing invoiceable entities (transactions and payments).
 * Handles server-side pagination, filtering, and invoice operations.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoiceableService {
  private http = inject(HttpClient);

  /** Signal indicating loading state */
  private _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  /** Signal holding error message */
  private _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  /** Base URL for invoiceable endpoints */
  private readonly baseUrl = `${environment.apiUrl}/v1/invoiceables`;
  private readonly billingUrl = `${environment.apiUrl}/v1/billing/invoices`;

  /**
   * Retrieves invoiceable entities with server-side pagination and filtering.
   * @param page Page number (0-indexed)
   * @param size Page size
   * @param sort Sort field and direction (e.g., 'date,desc')
   * @param filters Optional filters
   * @returns Observable with Page response
   */
  getInvoiceables(
    page: number = 0,
    size: number = 10,
    sort?: string,
    filters?: InvoiceableFilter
  ): Observable<PageResponse<Invoiceable>> {
    this._isLoading.set(true);
    this._error.set(null);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // Add sort parameter if provided
    if (sort) {
      params = params.set('sort', sort);
    }

    // Add filter parameters if provided
    if (filters) {
      if (filters.type) {
        params = params.set('type', filters.type);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo.toISOString());
      }
      if (filters.description) {
        params = params.set('description', filters.description);
      }
      if (filters.amount !== undefined && filters.amount !== null) {
        params = params.set('amount', filters.amount.toString());
      }
      if (filters.hasInvoiceReference !== undefined && filters.hasInvoiceReference !== null) {
        params = params.set('hasInvoiceReference', filters.hasInvoiceReference.toString());
      }
    }

    return this.http.get<PageResponse<InvoiceableDTO>>(this.baseUrl, { params }).pipe(
      map(response => ({
        ...response,
        content: response.content.map(dto => this.mapDtoToInvoiceable(dto))
      })),
      catchError(error => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load invoices';
        this._error.set(errorMessage);
        return throwError(() => error);
      }),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Retries invoice creation for a given invoice reference.
   * @param invoiceReferenceId Invoice reference ID
   * @returns Observable with retry response
   */
  retryInvoice(invoiceReferenceId: number): Observable<RetryInvoiceResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<RetryInvoiceResponse>(`${this.billingUrl}/reference/${invoiceReferenceId}/retry`, {})
      .pipe(
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to retry invoice';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        finalize(() => this._isLoading.set(false))
      );
  }

  /**
   * Downloads invoice PDF for a given invoice ID.
   * @param invoiceId Invoice ID from invoice reference
   * @returns Observable<Blob>
   */
  downloadInvoicePdf(invoiceId: string): Observable<Blob> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get(`${this.billingUrl}/${invoiceId}/pdf`, { responseType: 'blob' })
      .pipe(
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to download PDF';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        finalize(() => this._isLoading.set(false))
      );
  }

  /**
   * Maps InvoiceableDTO to Invoiceable domain model.
   */
  private mapDtoToInvoiceable(dto: InvoiceableDTO): Invoiceable {
    return {
      id: dto.id,
      type: dto.type,
      date: new Date(dto.date),
      description: dto.description,
      amount: dto.amount,
      invoiceReference: dto.invoiceReference
        ? {
          invoiceReferenceId: dto.invoiceReference.invoiceReferenceId,
          invoiceReference: dto.invoiceReference.invoiceReference,
          invoiceableId: dto.invoiceReference.invoiceableId,
          invoiceData: dto.invoiceReference.invoiceData
        }
        : undefined,
      hasInvoice: !!dto.invoiceReference
    };
  }

  /**
   * Clears the current error state.
   */
  clearError(): void {
    this._error.set(null);
  }
}
