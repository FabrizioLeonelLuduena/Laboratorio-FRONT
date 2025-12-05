import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Request para actualizar una determinación en Analytical
 */
export interface UpdateDeterminationRequest {
  value: string;
  observations?: string | null;
}

/**
 * Response de la determinación actualizada
 */
export interface DeterminationResponse {
  id: number;
  value: string;
  observations?: string;
  updatedAt?: string;
}

/**
 * Servicio para gestionar determinaciones desde el módulo Analytical
 *
 * Endpoint: PUT /api/v1/analytical/results/{determinationId}
 * Puerto: 8009 (Analytical)
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticalDeterminationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/analytical/results`;

  /**
   * Actualiza el valor de una determinación
   *
   * @param determinationId - ID de la determinación a actualizar
   * @param value - Nuevo valor
   * @param observations - Observaciones opcionales
   * @returns Observable con la determinación actualizada
   *
   * @example
   * this.service.updateDetermination(123, '13.8', 'Ayuno incompleto')
   *   .subscribe({
   *     next: (det) => console.log('Actualizada:', det),
   *     error: (err) => this.handleError(err)
   *   });
   */
  updateDetermination(
    determinationId: number,
    value: string,
    observations?: string
  ): Observable<DeterminationResponse> {
    const url = `${this.baseUrl}/${determinationId}`;
    const body: UpdateDeterminationRequest = {
      value,
      observations: observations || null
    };

    return this.http.put<DeterminationResponse>(url, body);
  }
}

