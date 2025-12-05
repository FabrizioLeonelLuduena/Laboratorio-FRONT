import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { LabelConfigurationCreateDTO, LabelConfigurationDTO, LabelConfigurationUpdateDTO } from '../models/label-configuration.interface';

/**
 * Service for label configuration CRUD operations
 */
@Injectable({ providedIn: 'root' })
export class LabelConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/label-configurations`;

  /**
   * Get all label configurations with optional filters
   * @param id Optional label configuration ID
   * @param analysisId Optional analysis ID filter
   */
  findAll(id?: number, analysisId?: number): Observable<LabelConfigurationDTO[]> {
    let params = new HttpParams();

    if (id != null) {
      params = params.set('id', id.toString());
    }
    if (analysisId != null) {
      params = params.set('analysisId', analysisId.toString());
    }

    return this.http.get<LabelConfigurationDTO[]>(this.baseUrl, { params });
  }

  /**
   * Create a new label configuration
   * @param dto Creation data
   */
  create(dto: LabelConfigurationCreateDTO): Observable<LabelConfigurationDTO> {
    return this.http.post<LabelConfigurationDTO>(this.baseUrl, dto);
  }

  /**
   * Update an existing label configuration
   * @param id Label configuration ID
   * @param dto Update data
   */
  update(id: number, dto: LabelConfigurationUpdateDTO): Observable<LabelConfigurationDTO> {
    return this.http.patch<LabelConfigurationDTO>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Soft delete (deactivate) a label configuration
   * @param id Label configuration ID
   */
  delete(id: number): Observable<LabelConfigurationDTO> {
    return this.http.delete<LabelConfigurationDTO>(`${this.baseUrl}/${id}`);
  }
}
