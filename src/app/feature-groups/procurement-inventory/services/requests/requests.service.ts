import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from 'src/environments/environment';

import { RequestFiltersDTO, RequestResponseDTO } from '../../models/requests/requests.models';
import { PageResponse } from '../../shared/utils/pagination';


/**
 * Servicio para gestión de solicitudes de compra
 */
@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/stock/requests`;

  /**
   * Busca solicitudes con filtros aplicados
   * @param f - Filtros de búsqueda para solicitudes
   * @returns Observable con página de resultados de solicitudes
   */
  search(f: RequestFiltersDTO) {
    let params = new HttpParams();
    Object.entries(f || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PageResponse<RequestResponseDTO>>(this.baseUrl, { params });
  }
}
