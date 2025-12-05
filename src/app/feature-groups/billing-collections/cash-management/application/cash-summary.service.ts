import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Observable, tap, catchError, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { CashSummary } from '../domain/cash-summary.model';

/**
 * CashSummaryService provides methods to retrieve financial summaries and dashboard metrics for cash sessions.
 * It manages loading and error state for summary-related API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class CashSummaryService {
  /**
   * HttpClient instance for making API requests.
   */
  private http = inject(HttpClient);

  /**
   * Signal indicating whether a summary request is in progress.
   */
  private _isLoading = signal<boolean>(false);

  /**
   * Signal holding the current error message, if any, from summary requests.
   */
  private _error = signal<string | null>(null);

  /**
   * Read-only signal exposing the loading state to consumers.
   */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Read-only signal exposing the error state to consumers.
   */
  readonly error = this._error.asReadonly();
  /** Base URL for all payment-related endpoints. */
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  private _summary = signal<CashSummary | null>(null);
  readonly summary = this._summary.asReadonly();


  /**
   * Fetches the financial summary for a specific cash session.
   * @param sessionId - The unique identifier of the cash session
   * @returns Observable<CashSummary> containing the session's financial summary
   */
  getSummary(sessionId: number): Observable<CashSummary> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<CashSummary>(`${this.baseUrl}/registers/${sessionId}/summary`)
      .pipe(
        tap(summary => this._summary.set(summary)),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  /**
   * Refreshes the current cash session summary by fetching it from the backend.
   * Updates the internal signal `_summary` with the new data or sets it to null if an error occurs.
   * @param sessionId - The ID of the active cash session to refresh.
   */
  refresh(sessionId: number): void {
    this.getSummary(sessionId).subscribe({
      next: (s) => this._summary.set(s),
      error: () => this._summary.set(null)
    });
  }

  /**
   * Clears the current cash session summary by setting the `_summary` signal to null.
   */
  clear(): void {
    this._summary.set(null);
  }

}
