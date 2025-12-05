import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { finalize } from 'rxjs';
import {
  CashRegisterDTO,
  CreateRegistersRequestDTO
} from 'src/app/feature-groups/billing-collections/cash-management/dto/response/cash-register.dto';

import { environment } from '../../../../../environments/environment';


/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private http = inject(HttpClient);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Base URL for register endpoints */
  private readonly baseUrl = `${environment.apiUrl}/v1/registers`;

  /**
   * Creates multiple cash registers for a branch.
   * POST /v1/registers/bulk
   */
  createCashRegisters(request: CreateRegistersRequestDTO) {
    this._isLoading.set(true);
    return this.http.post<CashRegisterDTO[]>(
      `${this.baseUrl}/bulk`,
      request
    ).pipe(finalize(() => this._isLoading.set(false)));
  }

  /**
   * Synchronizes the number of cash registers for a branch.
   * POST /v1/registers/sync
   */
  syncRegisters(request: CreateRegistersRequestDTO) {
    this._isLoading.set(true);
    return this.http.post<CashRegisterDTO[]>(
      `${this.baseUrl}/sync`,
      request
    ).pipe(finalize(() => this._isLoading.set(false)));
  }
}
