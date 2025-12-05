import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Service to obtain support information like neighborhoods, cities and provinces.
 */
@Injectable({
  providedIn: 'root'
})
export class SupportService {
  /**
   * HttpClient injection.
   */
  constructor(private http: HttpClient) {}

  private apiUrl = `${environment.apiUrl}/v2/configurations`;

  /**
   * Get all provinces.
   */
  getAllProvinces(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/provinces`);
  }

  /**
   * Method to get a list of cities with the id of a province.
   * @param id
   */
  getCitiesByProvinceId(id: number): Observable<any> {
    const params: HttpParams = new HttpParams().set('provinceId', String(id));
    // Backend endpoint: /api/v2/configurations/cities/province?provinceId=...
    return this.http.get<any>(`${this.apiUrl}/cities/province`, { params });
  }

  /**
   * Method to get a list of neighborhoods with the id of a city.
   * @param id
   */
  getNeighborhoodByCityId(id: number): Observable<any> {
    const params: HttpParams = new HttpParams().set('cityId', String(id));
    // Backend endpoint: /api/v2/configurations/neighborhoods/city?cityId=...
    return this.http.get<any>(`${this.apiUrl}/neighborhoods/city`, { params });
  }
}
