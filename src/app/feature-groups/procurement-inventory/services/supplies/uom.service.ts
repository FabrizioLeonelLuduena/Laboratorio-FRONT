import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ResponseUomDTO } from '../../models/uoms/uom.model';

/**
 * Service for managing Units of Measure (UOM)
 * Fetches UOM data from backend API
 */
@Injectable({
  providedIn: 'root'
})
export class UomService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/uoms`;
  private http = inject(HttpClient);

  /**
   * Get all Units of Measure
   * @returns Observable with array of ResponseUomDTO
   */
  getUoms(): Observable<ResponseUomDTO[]> {
    return this.http.get<ResponseUomDTO[]>(this.apiUrl);
  }
}

