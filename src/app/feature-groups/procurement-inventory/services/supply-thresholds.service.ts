import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { catchError } from 'rxjs/operators';


/**
 * DTO para crear o actualizar umbrales - RequestStockThresholdDTO del backend
 */
export interface RequestStockThresholdDTO {
  supplyId: number;
  locationId: number;
  minimumStock: number;
  maximumStock: number;
}

/**
 * DTO para respuesta completa de umbrales - ResponseStockThresholdDTO del backend
 */
export interface ResponseStockThresholdDTO {
  id: number;
  supplyId: number;
  supplyName: string;
  locationId: number;
  locationName: string;
  locationPath: string;
  minimumStock: number;
  maximumStock: number;
  createdDateTime: string;
  lastUpdatedDateTime: string;
}

/**
 * DTO para ubicaciones en dropdown - LocationForThresholdDTO del backend
 */
export interface LocationForThresholdDTO {
  locationId: number;
  locationName: string;
  locationPath: string;
  hasThreshold: boolean;
  minimumStock?: number;
  maximumStock?: number;
  thresholdId?: number;
}

/**
 * Wrapper with messages answers - StockThresholdResponseDTO from backend
 * 
 */
export interface StockThresholdResponseDTO {
  message: string;
  threshold: ResponseStockThresholdDTO;
}

/**
 * Service for managing supply stock thresholds per location
 * Handles minimum and maximum stock levels for each supply-location combination
 *
 *  backend StockThresholdController
 * Endpoints: /api/v1/stock/stock-thresholds
 */
@Injectable({
  providedIn: 'root'
})
export class SupplyThresholdsService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/stock-thresholds`;
  private http = inject(HttpClient);

  /**
   * Obtiene todas las ubicaciones activas para un insumo con indicador de umbral configurado
   * Endpoint: GET /api/v1/stock/stock-thresholds/supply/{supplyId}/locations
   *
   * @param supplyId - ID del insumo
   * @returns Observable con array de ubicaciones con flag hasThreshold y valores precargados
   */
  getLocationsForSupply(supplyId: number): Observable<LocationForThresholdDTO[]> {
    const url = `${this.apiUrl}/supply/${supplyId}/locations`;
    // eslint-disable-next-line no-console -- Debug log for endpoint call
    console.log('🔍 Calling endpoint:', url);
    return this.http.get<LocationForThresholdDTO[]>(url);
  }

  /**
   * Obtiene el umbral específico para una combinación supply-location
   * Endpoint: GET /api/v1/stock/stock-thresholds/supply/{supplyId}/location/{locationId}
   * Retorna 404 si no existe
   *
   * @param supplyId - ID del insumo
   * @param locationId - ID de la ubicación
   * @returns Observable con el umbral o null si no existe (404)
   */
  getThresholdBySupplyAndLocation(
    supplyId: number,
    locationId: number
  ): Observable<ResponseStockThresholdDTO | null> {
    return this.http.get<ResponseStockThresholdDTO>(
      `${this.apiUrl}/supply/${supplyId}/location/${locationId}`
    ).pipe(
      catchError((error) => {
        // If its 404, returns null (no existe umbral)
        if (error.status === 404) {
          return of(null);
        }
        // For other errors, give error
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo umbral
   * Endpoint: POST /api/v1/stock/stock-thresholds
   * Retorna 201 Created con mensaje de éxito
   *
   * @param threshold - Datos del umbral a crear
   * @returns Observable con wrapper de respuesta y mensaje
   */
  createThreshold(threshold: RequestStockThresholdDTO): Observable<StockThresholdResponseDTO> {
    return this.http.post<StockThresholdResponseDTO>(this.apiUrl, threshold);
  }

  /**
   * Actualiza un umbral existente
   * Endpoint: PUT /api/v1/stock/stock-thresholds/{id}
   * Retorna 200 OK con mensaje de éxito
   *
   * @param id - ID del umbral a actualizar
   * @param threshold - Datos actualizados del umbral
   * @returns Observable con wrapper de respuesta y mensaje
   */
  updateThreshold(id: number, threshold: RequestStockThresholdDTO): Observable<StockThresholdResponseDTO> {
    return this.http.put<StockThresholdResponseDTO>(`${this.apiUrl}/${id}`, threshold);
  }

}

