import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  BranchRegistersDTO, CashRegisterForMainDTO,
  CashSessionDTO,
  EmptyRegisterRequestDTO,
  EmptyRegisterResponseDTO,
  Page, RegisterSessionsFilter
} from '../dto/response/cash-register.dto';

/**
 * Service responsible for managing cash register operations.
 * Includes session opening/closing, movement registration, summaries, and dashboard metrics.
 */
@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {

  /** Injected HTTP client for backend communication */
  private http = inject(HttpClient);

  /** Base URL for all registers-related endpoints. */
  private readonly baseUrl = `${environment.apiUrl}/v1/registers`;

  /** Obtain user ID if stored locally */
  private getUserId(): number {
    return Number(localStorage.getItem('userId')) || 1;
  }

  /**
   * Build standard headers required by backend for new endpoints in this service.
   * Adds required `X-User-Id` and optional `x-branch-id`.
   * Defaults Content-Type to application/json.
   */
  private buildHeaders( branchId?: number): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (branchId != null) {
      headers = headers.set('x-branch-id', String(branchId));
    }
    return headers;
  }

  /**
   * Common error handler that extracts a backend message when possible
   * and falls back to a generic message.
   */
  private handleError(operation: string) {
    return (error: any) => {
      const backendMsg = error?.error?.message || error?.message;
      const message = backendMsg || 'Unexpected service error';
      return throwError(() => new Error(`${operation} failed: ${message}`));
    };
  }

  /**
   * Retrieves cash register's name associated with a specific id.
   * @param registerId - Cash Register identifier
   * @returns Observable with the cash register's name
   */
  getRegisterNameById(registerId: number): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/${registerId}/name`,
      { responseType: 'text' as const }
    );
  }

  // ===== New endpoints (do not alter existing behavior above) =====

  /**
   * GET /api/v1/registers/main
   * Retrieves the main cash register.
   */
  getMainRegister(): Observable<CashRegisterForMainDTO> {
    return this.http
      .get<CashRegisterForMainDTO>(`${this.baseUrl}/main`, {
        headers: this.buildHeaders()
      })
      .pipe(catchError(this.handleError('getMainRegister')));
  }

  /**
   * GET /api/v1/registers/branches
   * Retrieves branches and their registers.
   */
  getBranches(): Observable<BranchRegistersDTO[]> {
    return this.http
      .get<BranchRegistersDTO[]>(`${this.baseUrl}/branches`, {
        headers: this.buildHeaders()
      })
      .pipe(catchError(this.handleError('getBranches')));
  }

  /**
   * GET /api/v1/registers/{id}/sessions
   * Retrieves paginated sessions for a given register.
   */
  getRegisterSessions(
    id: number,
    filters: RegisterSessionsFilter = {}
  ): Observable<Page<CashSessionDTO>> {
    let params = new HttpParams();
    if (filters.page != null) params = params.set('page', String(filters.page));
    if (filters.size != null) params = params.set('size', String(filters.size));
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.userId != null) params = params.set('userId', String(filters.userId));
    if (filters.openedFrom) params = params.set('openedFrom', filters.openedFrom);
    if (filters.openedTo) params = params.set('openedTo', filters.openedTo);

    return this.http
      .get<Page<CashSessionDTO>>(`${this.baseUrl}/${id}/sessions`, {
        headers: this.buildHeaders(),
        params
      })
      .pipe(catchError(this.handleError('getRegisterSessions')));
  }

  /**
   * POST /api/v1/registers/{id}/empty
   * Empties a register to the main register.
   */
  emptyRegister(
    id: number,
    body: EmptyRegisterRequestDTO
  ): Observable<EmptyRegisterResponseDTO> {
    return this.http
      .post<EmptyRegisterResponseDTO>(`${this.baseUrl}/${id}/empty`, body, {
        headers: this.buildHeaders()
      })
      .pipe(catchError(this.handleError('emptyRegister')));
  }

}

