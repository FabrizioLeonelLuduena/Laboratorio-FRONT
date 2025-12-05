import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ProvidedServiceCompleteResponseDTO } from '../models/provided-service.model';

/**
 * Service to fetch provided services pages for settlements (from Redis-backed endpoint).
 */
@Injectable({ providedIn: 'root' })
export class ProvidedServicesService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/settlement-pages`;


  /**
   * Contructor for ProvidedServicesService.
   */
  constructor(private http: HttpClient) {}


  /**
   * Retrieves a provided services page given a Redis base key and page index (0-based).
   */
  getSettlementPage(key: string, page: number): Observable<ProvidedServiceCompleteResponseDTO[]> {
    const params = new HttpParams().set('key', key).set('page', page.toString());
    return this.http.get<ProvidedServiceCompleteResponseDTO[]>(this.API_URL, {
      params
    });
  }
}
