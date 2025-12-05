import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { StockLocationsResponseDTO } from '../models/stock-locations/stock-locations.model';

/**
 * Service for managing stock locations with their supplies and batches
 * Fetches stock location data from backend API
 */
@Injectable({
  providedIn: 'root'
})
export class StockLocationsService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/stock-locations`;
  private http = inject(HttpClient);

  /**
   * Get all stock locations with their supplies and batches
   * @returns Observable with array of StockLocationDTO
   */
  getStockLocations(): Observable<StockLocationsResponseDTO> {
    return this.http.get<StockLocationsResponseDTO>(this.apiUrl);
  }
}

