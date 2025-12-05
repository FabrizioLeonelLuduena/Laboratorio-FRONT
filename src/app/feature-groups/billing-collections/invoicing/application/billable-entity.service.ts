import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

import { BillableEntity, InvoiceableDto } from '../domain';
import { BillableEntityType } from '../domain/billable-entity-type.enum';

/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class BillableEntityService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/invoiceables`;

  // Signals for reactive state
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  entities = signal<BillableEntity[]>([]);
  totalRecords = signal<number>(0);

  /**
   * Get all billable entities
   * Backend returns a simple list without pagination
   */
  getEntities(): Observable<BillableEntity[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<InvoiceableDto[]>(this.apiUrl).pipe(
      map((dtos) => dtos.map((dto) => this.mapDtoToEntity(dto))),
      tap((entities) => {
        this.entities.set(entities);
        this.totalRecords.set(entities.length);
      }),
      catchError((err) => {
        const errorMessage =
          err.error?.message || 'Failed to load billable entities';
        this.error.set(errorMessage);
        return of([]);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  /**
   * Get a single billable entity by ID
   */
  getEntityById(id: number): Observable<BillableEntity | null> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<InvoiceableDto>(`${this.apiUrl}/${id}`).pipe(
      map((dto) => this.mapDtoToEntity(dto)),
      catchError((err) => {
        const errorMessage =
          err.error?.message || 'Failed to load billable entity';
        this.error.set(errorMessage);
        return of(null);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  /**
   * Generate invoice for a billable entity
   * This will trigger the external API call on the backend
   */
  generateInvoice(entityId: number): Observable<BillableEntity | null> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http
      .post<InvoiceableDto>(`${this.apiUrl}/${entityId}/generate-invoice`, {})
      .pipe(
        map((dto) => this.mapDtoToEntity(dto)),
        catchError((err) => {
          const errorMessage =
            err.error?.message || 'Failed to generate invoice';
          this.error.set(errorMessage);
          return of(null);
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      );
  }

  /**
   * Download invoice PDF
   * Backend endpoint: GET /api/v1/billing/invoices/{invoiceId}/pdf
   */
  downloadInvoicePdf(invoiceId: string): Observable<Blob | null> {
    this.isLoading.set(true);
    this.error.set(null);

    // Updated to match backend API structure
    const pdfUrl = `${environment.apiUrl}/v1/billing/invoices/${invoiceId}/pdf`;

    return this.http
      .get(pdfUrl, {
        responseType: 'blob'
      })
      .pipe(
        catchError((_err) => {
          const errorMessage = 'Failed to download invoice PDF';
          this.error.set(errorMessage);
          return of(null);
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      );
  }

  /**
   * Map backend DTO to frontend model (flattening the structure)
   */
  private mapDtoToEntity(dto: InvoiceableDto): BillableEntity {
    return {
      id: dto.id,
      type: dto.type as BillableEntityType,
      date: new Date(dto.date),
      description: dto.description,
      amount: dto.amount,
      invoiceReferenceId: dto.invoiceReferenceDTO?.invoiceReferenceId,
      invoiceReference: dto.invoiceReferenceDTO?.invoiceReference,
      hasInvoice: !!dto.invoiceReferenceDTO
    };
  }

  /**
   * Mock data is no longer provided; rely on backend results only.
   */
  getMockEntities(): BillableEntity[] {
    return [];
  }
}