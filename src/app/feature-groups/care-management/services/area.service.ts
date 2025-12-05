
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AreaRequest, AreaResponse } from '../models/area.models';

/**
 * Service for managing branch areas.
 */
@Injectable({
  providedIn: 'root'
})
export class AreaService {

  /**
   * HttpClient injection.
   */
  constructor(private http: HttpClient) { }
  private apiUrl: string = `${environment.apiUrl}/v2/configurations/areas`;

  /**
   * Post an Area.
   */
  postArea(area: AreaRequest): Observable<AreaResponse> {
    return this.http.post<AreaResponse>(this.apiUrl, area);
  }

  /**
   * Get all Areas.
   */
  getAllAreas(): Observable<AreaResponse[]> {
    return this.http.get<AreaResponse[]>(this.apiUrl);
  }
}
