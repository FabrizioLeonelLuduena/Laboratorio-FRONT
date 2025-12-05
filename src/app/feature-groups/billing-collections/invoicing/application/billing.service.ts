import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';

import { Observable, tap, catchError, of, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { Billing, BillingItem, BillingListResponseDto, BillingResponseDto } from '../domain';
import { BillingMapper } from '../mappers/billing.mapper';

/**
 * BillingService - Service for managing billing/invoice operations
 * Handles CRUD operations, state management, and API communication
 */
@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly http = inject(HttpClient);

  // Updated to match backend API structure (Colppy integration)
  private readonly apiUrl = `${environment.apiUrl}/v1/billing/invoices`;

  // Signals for reactive state management
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentBilling = signal<Billing | null>(null);
  private readonly _billingList = signal<Billing[]>([]);

  // Public read-only signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentBilling = this._currentBilling.asReadonly();
  readonly billingList = this._billingList.asReadonly();

  /**
   * Create a new billing/invoice (old endpoint - kept for backward compatibility)
   * @deprecated Use createInvoiceReference instead for new invoices
   */
  createBilling(billing: Billing): Observable<Billing> {
    this._isLoading.set(true);
    this._error.set(null);

    const requestDto = BillingMapper.toCreateRequestDto(billing);

    return this.http.post<BillingResponseDto>(this.apiUrl, requestDto).pipe(
      map(response => BillingMapper.fromResponseDto(response)),
      tap((createdBilling) => {
        this._currentBilling.set(createdBilling);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        const errorMessage = error?.error?.message || 'Failed to create invoice';
        this._error.set(errorMessage);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Create a new invoice reference (invoice + invoiceable linkage)
   * Uses the new /reference endpoint that links the invoice to an invoiceable entity
   * @param billing The billing/invoice data
   * @param invoiceableId The ID of the invoiceable entity (transaction/payment) to link
   * @param isAttention Optional flag indicating if this requires attention
   */
  createInvoiceReference(
    billing: Billing,
    invoiceableId: number,
    isAttention?: boolean
  ): Observable<any> {
    this._isLoading.set(true);
    this._error.set(null);

    // Get the invoice data in camelCase (as expected by backend)
    const invoiceData = BillingMapper.toColppyInvoiceRequestDto(billing);

    // Manually construct the request with correct casing:
    // - Top level: snake_case (invoiceable_id, invoice_data) - will be converted by interceptor
    // - Nested invoice_data: already in camelCase - interceptor will convert to snake_case
    // So we need to send it in a way that after interceptor conversion, invoice_data stays camelCase
    // Solution: Use camelCase for the DTO, interceptor will convert top level to snake_case
    const requestDto = {
      invoiceableId: invoiceableId,
      isAttention: isAttention,
      invoiceData: invoiceData
    };

    return this.http.post<any>(`${this.apiUrl}/reference`, requestDto).pipe(
      tap(() => {
        this._isLoading.set(false);
        // Optionally update currentBilling if needed
        // this._currentBilling.set(response);
      }),
      catchError((error) => {
        const errorMessage = error?.error?.message || 'Failed to create invoice reference';
        this._error.set(errorMessage);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Get billing by ID from Colppy
   * Uses Colppy sales endpoint
   */
  getBillingById(id: string): Observable<Billing> {
    this._isLoading.set(true);
    this._error.set(null);

    // Backend endpoint: GET /api/v1/billing/invoices/sales/{idFactura}
    return this.http.get<BillingResponseDto>(`${this.apiUrl}/sales/${id}`).pipe(
      map(response => BillingMapper.fromResponseDto(response)),
      tap((billing) => {
        this._currentBilling.set(billing);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        const errorMessage = error?.error?.message || 'Failed to fetch invoice';
        this._error.set(errorMessage);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Get all billings from Colppy with pagination
   * Backend endpoint: GET /api/v1/billing/invoices/sales?start=0&limit=50
   */
  getBillings(start: number = 0, limit: number = 50): Observable<BillingListResponseDto> {
    this._isLoading.set(true);
    this._error.set(null);

    let params = new HttpParams()
      .set('start', start.toString())
      .set('limit', limit.toString());

    return this.http.get<BillingListResponseDto>(`${this.apiUrl}/sales`, { params }).pipe(
      tap((response) => {
        const billings = response.data?.map(dto => BillingMapper.fromResponseDto(dto)) || [];
        this._billingList.set(billings);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        const errorMessage = error?.error?.message || 'Failed to fetch invoices';
        this._error.set(errorMessage);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  // ============================================================================
  // METHODS NOT SUPPORTED BY BACKEND (Colppy doesn't allow editing invoices)
  // For implementation details, see: COLPPY_LIMITATIONS.md (git-ignored)
  // ============================================================================

  /**
   * Get billings by customer - NOT SUPPORTED WITH FILTERS
   * Colppy API doesn't support filtering, use getBillings() and filter client-side
   * TODO: Future implementation if backend adds filtering support
   * WARNING: May be inefficient for large datasets (currently limited to 1000 records)
   * Consider implementing pagination or requesting backend filtering support
   */
  getBillingsByCustomer(customerId: string): Observable<Billing[]> {
    return this.getBillings(0, 1000).pipe(
      map((response) => {
        const billings = response.data?.map(dto => BillingMapper.fromResponseDto(dto)) || [];
        const filtered = billings.filter(b => b.customerId === customerId);
        this._billingList.set(filtered);
        return filtered;
      })
    );
  }

  /**
   * Get billings by date range - NOT SUPPORTED WITH FILTERS
   * Colppy API doesn't support filtering, use getBillings() and filter client-side
   * TODO: Future implementation if backend adds filtering support
   * WARNING: May be inefficient for large datasets (currently limited to 1000 records)
   * Consider implementing pagination or requesting backend filtering support
   */
  getBillingsByDateRange(startDate: string, endDate: string): Observable<Billing[]> {
    return this.getBillings(0, 1000).pipe(
      map((response) => {
        const billings = response.data?.map(dto => BillingMapper.fromResponseDto(dto)) || [];
        const filtered = billings.filter(b => {
          const invoiceDate = new Date(b.invoiceDate);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return invoiceDate >= start && invoiceDate <= end;
        });
        this._billingList.set(filtered);
        return filtered;
      })
    );
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Clear current billing
   */
  clearCurrentBilling(): void {
    this._currentBilling.set(null);
  }

  /**
   * Set current billing (for edit mode)
   */
  setCurrentBilling(billing: Billing): void {
    this._currentBilling.set(billing);
  }

  /**
   * Placeholder for item retrieval.
   * The backend currently owns item discovery; this method should be wired when the API is ready.
   */
  getSampleItems(): Observable<BillingItem[]> {
    return of([]);
  }
}

