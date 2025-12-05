import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { RequestAreaDTO, ResponseAreaDTO } from '../models/areas/areas.model';

/**
 * Areas service
 */
@Injectable({
  providedIn: 'root'
})
export class AreasService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/areas`;
  private http = inject(HttpClient);

  /**
   * Get all areas
   */
  getAllAreas(): Observable<ResponseAreaDTO[]> {
    return this.http.get<ResponseAreaDTO[]>(this.apiUrl);
  }

  /**
   * Get area by id
   */
  getAreaById(id: string): Observable<ResponseAreaDTO> {
    return this.http.get<ResponseAreaDTO>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create area
   */
  createArea(area: RequestAreaDTO): Observable<ResponseAreaDTO> {
    return this.http.post<ResponseAreaDTO>(this.apiUrl, area);
  }

  /**
   * Update area
   */
  updateArea(id: string, area: RequestAreaDTO): Observable<ResponseAreaDTO> {
    return this.http.put<ResponseAreaDTO>(`${this.apiUrl}/${id}`, area);
  }

  /**
   * Deactivate area
   */
  deactivateArea(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}`, { isActive: false });
  }
}
