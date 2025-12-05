import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { CashRegister } from '../domain/cash-register.model';
import { CashSummary } from '../domain/cash-summary.model';
import { CashSessionDto } from '../dto/response/cash-session.dto';
import { CashSessionMapper } from '../mappers/cash-session.mapper';
import { CashOpeningFormValue } from '../view-models/cash-opening.vm';

/**
 * CashSessionService manages the lifecycle of cash register sessions, including opening, closing, and retrieving the current session.
 * It maintains loading and error state signals for session-related operations.
 */
@Injectable({
  providedIn: 'root'
})
export class CashSessionService {
  /**
   * HttpClient instance for making API requests.
   */
  private http = inject(HttpClient);

  private _summary = signal<CashSummary | null>(null);

  readonly summary = this._summary.asReadonly();

  /**
   * Signal holding the current active cash session, or null if none is open.
   */
  private _currentSession = signal<CashRegister | null>(null);

  /**
   * Signal indicating whether a session operation is in progress.
   */
  private _isLoading = signal<boolean>(false);

  /**
   * Signal holding the current error message, if any, from session operations.
   */
  private _error = signal<string | null>(null);

  /**
   * Read-only signal exposing the current session to consumers.
   */
  readonly currentSession = this._currentSession.asReadonly();

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
  /**
   * Computed signal indicating whether a session is currently open.
   * Returns true if a session exists and its status is 'OPEN'.
   */
  readonly isSessionOpen = computed(() => {
    const session = this._currentSession();
    return session !== null && session.status === 'OPEN';
  });


  /**
   * Opens a new cash register session with the provided form data.
   * @param formValue - Form data for opening the session
   * @param cashRegisterId - Cash register ID to open
   * @returns Observable<CashRegister> with the created session
   */
  openSession(formValue: CashOpeningFormValue, cashRegisterId: number = 1): Observable<CashRegister> {
    this._isLoading.set(true);
    this._error.set(null);

    const request = CashSessionMapper.formToRequestDto(formValue, cashRegisterId);

    return this.http
      .post<CashSessionDto>(
        `${this.baseUrl}/registers/open`,
        request
      )
      .pipe(
        map(dto => CashSessionMapper.dtoToDomain(dto)),
        tap(session => this._currentSession.set(session)),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        finalize(() => this._isLoading.set(false))
      );
  }

  /**
   * Loads the current session from backend if exists
   */
  loadCurrentSession(): Observable<CashRegister | null> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<CashSessionDto>(`${this.baseUrl}/registers/session/current`)
      .pipe(
        map(dto => CashSessionMapper.dtoToDomain(dto)),
        tap(session => this._currentSession.set(session)),
        catchError(error => {
          if (error?.status === 404) {
            this._currentSession.set(null);
            return of(null);
          }
          const errorMessage = error?.error?.message || error?.message || 'Error al cargar sesión';
          this._error.set(errorMessage);
          return of(null);
        }),
        finalize(() => this._isLoading.set(false))
      );
  }

  /**
   * Cierra la sesión enviando el monto final al backend.
   * Enviamos `finalCash` como string con 2 decimales para evitar problemas de precisión en floats.
   * @param amount monto final reportado (en la misma unidad/currency que maneja el backend)
   */
  closeSessionWithAmount(amount: number): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    const currentSession = this._currentSession();
    if (!currentSession) {
      this._isLoading.set(false);
      return throwError(() => new Error('No hay sesión abierta para cerrar'));
    }

    const payload = { final_cash: amount.toFixed(2) };

    return this.http
      .post(`${this.baseUrl}/registers/close`, payload)
      .pipe(
        map(() => {
          this._currentSession.set(null);
          return void 0;
        }),
        catchError((error) => {
          const msg = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(msg);
          return throwError(() => new Error(msg));
        }),
        finalize(() => this._isLoading.set(false))
      );
  }

  /**
   * Clears the current error state for session operations.
   */
  clearError(): void {
    this._error.set(null);
  }

}
