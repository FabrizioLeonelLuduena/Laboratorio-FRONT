import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { map, shareReplay } from 'rxjs/operators';


import { environment } from '../../../../../environments/environment';

/**
 * Interface for Colppy accounting account
 */
export interface AccountLedger {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

/** Raw ledger record returned by the backend. */
interface AccountLedgerDto {
  id?: number;
  idCuenta?: number;
  nombre?: string;
  name?: string;
  codigo?: string;
  code?: string;
  descripcion?: string;
  description?: string;
}

/**
 * Response from Colppy accounts-ledger endpoint
 */
export interface AccountLedgerResponse {
  success: boolean;
  data: AccountLedgerDto[];
  message?: string;
}

/**
 * Service for managing accounting ledger accounts from Colppy
 */
@Injectable({
  providedIn: 'root'
})
export class AccountLedgerService {
  private readonly apiUrl = `${environment.apiUrl}/v1/billing/invoices/accounts-ledger`;

  // Cache the accounts to avoid multiple requests
  private accountsCache$?: Observable<AccountLedger[]>;

  /**
   * Constructor that injects HttpClient for making API requests
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Get all available accounting accounts from Colppy
   * Results are cached to avoid multiple requests
   */
  getAccounts(): Observable<AccountLedger[]> {
    if (!this.accountsCache$) {
      this.accountsCache$ = this.http.get<AccountLedgerResponse>(this.apiUrl).pipe(
        map(response => this.mapResponseToAccounts(response)),
        shareReplay(1) // Cache the result
      );
    }
    return this.accountsCache$;
  }

  /**
   * Clear the cache (useful for refresh)
   * Forces a fresh fetch on the next getAccounts() call
   */
  clearCache(): void {
    this.accountsCache$ = undefined;
  }

  /**
   * Map Colppy response to AccountLedger array
   */
  private mapResponseToAccounts(response: AccountLedgerResponse): AccountLedger[] {
    if (!response.success || !response.data) {
      return [];
    }

    return response.data.map((item) => ({
      id: item.id?.toString() || item.idCuenta?.toString() || '',
      name: item.nombre || item.name || '',
      code: item.codigo || item.code || '',
      description: item.descripcion || item.description || ''
    }));
  }

  /**
   * Find account by ID
   */
  getAccountById(accountId: string): Observable<AccountLedger | undefined> {
    return this.getAccounts().pipe(
      map(accounts => accounts.find(acc => acc.id === accountId))
    );
  }

  /**
   * Get accounts formatted for dropdown options
   */
  getAccountOptions(): Observable<Array<{ label: string; value: string }>> {
    return this.getAccounts().pipe(
      map(accounts => accounts.map(acc => ({
        label: `${acc.code ? acc.code + ' - ' : ''}${acc.name}`,
        value: acc.id
      })))
    );
  }
}
