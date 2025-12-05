import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { CashRegisterDTO, CashRegisterOption } from '../dto/response/cashRegister';

/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class RegistersService {
  private http = inject(HttpClient);

  /** Correct API Base URL */
  private readonly registersUrl = `${environment.apiUrl}/v1/registers`;

  /**
   *jj
   */
  private getUserId(): number {
    return Number(localStorage.getItem('userId')) || 1;
  }



  /**
   * Retrieves cash registers associated with a specific branch.
   */
  getByBranch(branchId: number): Observable<CashRegisterOption[]> {
    return this.http
      .get<CashRegisterDTO[]>(
        `${this.registersUrl}/branch/${branchId}`
      )
      .pipe(
        map(list => list.map(r => ({
          id: r.registerId,
          description: r.description
        })))
      );
  }
}
