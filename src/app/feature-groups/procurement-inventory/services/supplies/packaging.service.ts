import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { PackagingDTO } from '../../models/packagings/packaging.model';

/**
 * Service for managing Packaging operations
 * Provides methods to fetch and manage packaging data from the backend API
 */
@Injectable({
  providedIn: 'root'
})
export class PackagingService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/packagings`;
  private http = inject(HttpClient);

  /**
   * Get all packagings
   * @returns Observable with array of PackagingDTO
   */
  getAll(): Observable<PackagingDTO[]> {
    return this.http.get<PackagingDTO[]>(this.apiUrl);
  }

  /**
   * Get packaging by ID
   * @param id - Packaging ID
   * @returns Observable with PackagingDTO
   */
  getById(id: number): Observable<PackagingDTO> {
    return this.http.get<PackagingDTO>(`${this.apiUrl}/${id}`);
  }

}

