import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Observable, tap, map, catchError, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { CashMovement } from '../domain/cash-movement.model';
import { TransactionDto } from '../dto/response/transaction.dto';
import { CashMovementMapper } from '../mappers/cash-movement.mapper';

/**
 * Service responsible for managing cash movement operations.
 * Handles deposits, withdrawals, and movement retrieval.
 */
@Injectable({
  providedIn: 'root'
})
export class CashMovementService {
  private http = inject(HttpClient);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Base URL for all payment-related endpoints. */
  private readonly baseUrl = `${environment.apiUrl}/v1`;


  /**
   * Register a deposit movement
   */
  registerDeposit(formValue: { paymentMethod: string; amount: number; concept: string; observations?: string; receiptNumber?: string }, toMainRegister: boolean): Observable<CashMovement> {
    this._isLoading.set(true);
    this._error.set(null);

    const request = CashMovementMapper.depositFormToRequestDto(formValue, toMainRegister);

    return this.http
      .post<TransactionDto>(`${this.baseUrl}/registers/deposit`, request)
      .pipe(
        map(dto => CashMovementMapper.dtoToDomain(dto)),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }
  /**
   * Register a deposit movement
   */
  registerLiquidationDeposit(formValue: { paymentMethod: string; amount: number; concept: string; observations?: string; receiptNumber?: string;  liquidationId: number; }): Observable<CashMovement> {
    this._isLoading.set(true);
    this._error.set(null);

    const request = CashMovementMapper.depositFormLiquidationToRequestDto(formValue);
    return this.http
      .post<TransactionDto>(`${this.baseUrl}/registers/deposit/liquidation`, request)
      .pipe(
        map(dto => CashMovementMapper.dtoToDomain(dto)),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  /**
   * Register a withdrawal movement
   */
  registerWithdrawal(formValue: { paymentMethod: string, amount: number; concept: string; observations?: string; receiptNumber?: string }, toMainRegister: boolean): Observable<CashMovement> {
    this._isLoading.set(true);
    this._error.set(null);

    const request = CashMovementMapper.withdrawalFormToRequestDto(formValue, toMainRegister);

    return this.http
      .post<TransactionDto>(`${this.baseUrl}/registers/withdraw`, request)
      .pipe(
        map(dto => CashMovementMapper.dtoToDomain(dto)),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  /**
   * Register a generic movement (for backward compatibility)
   */
  registerMovement(movementData: any): Observable<any> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post(`${this.baseUrl}/registers/deposit`, movementData)
      .pipe(
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  /**
   * Get movements for a specific session
   */
  getMovements(sessionId: number): Observable<CashMovement[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<TransactionDto[]>(`${this.baseUrl}/registers/session/${sessionId}/movements`)
      .pipe(
        map(dtoList => dtoList.map(dto => CashMovementMapper.dtoToDomain(dto))),
        catchError(error => {
          const errorMessage = error?.error?.message || error?.message || 'Error al procesar la solicitud';
          this._error.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
