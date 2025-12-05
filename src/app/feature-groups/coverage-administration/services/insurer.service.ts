import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { InsurerTypeResponseDTO } from '../models/insurer-type.model';
import {
  Insurer,
  InsurerCompleteResponseDTO,
  InsurerResponseDTO,
  InsurerUpdateRequestDTO
} from '../models/insurer.model';

/**
 * Insurer Service
 * Handles CRUD operations for insurers and their types.
 * All comments and documentation are in English as requested.
 */
@Injectable({ providedIn: 'root' })
export class InsurerService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/insurers`;
  private readonly API_URL_TYPES = `${this.baseApiUrl}/coverages/insurer-types`;
  private readonly userId = 1; // temporary


  /** DI constructor. */
  constructor(private http: HttpClient) { }



  /** Returns only active insurers (so they disappear after soft delete) */
  getActiveInsurers(): Observable<InsurerCompleteResponseDTO[]> {
    return this.http.get<InsurerCompleteResponseDTO[]>(
      `${this.API_URL}/complete/search`
    );
  }

  /** Returns only active insurers (so they disappear after soft delete) */
  getAllSimpleInsurers(): Observable<InsurerResponseDTO[]> {
    return this.http.get<InsurerResponseDTO[]>(
      `${this.API_URL}`
    );
  }

  /**
   * Search with filters from backend. If no filters are passed, returns all active by default.
   * Expected params (adjust if backend uses different names):
   * - active: true|false (omitted => all)
   * - insurerTypeIds: CSV of IDs (e.g. "1,2,3")
   */
  searchInsurers(filters?: { active?: boolean; insurerTypeIds?: number[] }): Observable<InsurerCompleteResponseDTO[]> {
    const params: Record<string, string> = {};

    if (typeof filters?.active === 'boolean') {
      params['active'] = String(filters.active);
    }
    if (filters?.insurerTypeIds && filters.insurerTypeIds.length > 0) {
      params['insurerTypeIds'] = filters.insurerTypeIds.join(',');
    }

    return this.http.get<any[]>(
      `${this.API_URL}/complete/search`
    );
  }

  /**
   * Obtains the complete information of the insurer by id.
   */
  getCompleteById(id: number): Observable<InsurerCompleteResponseDTO> {
    return this.http.get<any>(
      `${this.API_URL}/complete/${id}`
    );
  }

  /**
   * Update insurer
   */
  update(insurer: InsurerUpdateRequestDTO): Observable<InsurerResponseDTO> {


    return this.http.put<InsurerResponseDTO>(
      `${this.API_URL}/${insurer.id}`,
      insurer
    );
  }



  /** Soft delete */
  deleteInsurer(id: number): Observable<InsurerResponseDTO> {
    return this.http.put<InsurerResponseDTO>(
      `${this.API_URL}/deactivate/${id}`, {}
    );
  }

  /** Activate */
  activateInsurer(id: number): Observable<InsurerResponseDTO> {
    return this.http.put<InsurerResponseDTO>(
      `${this.API_URL}/activate/${id}`, {}
    );
  }

  /**
   * Retrieves insurer types
   */
  getAllInsurerTypes(): Observable<InsurerTypeResponseDTO[]> {
    const url = `${this.API_URL_TYPES}`;
    return this.http.get<InsurerTypeResponseDTO[]>(url);
  }

  /**
   * Gets the complete history of an agreement, including the insurer and its plan.
   */
  getAgreementHistory(agreementId: number): Observable<any[]> {
    return this.http
      .get<any>(`${this.baseApiUrl}/complete/by-agreement/${agreementId}`);
  }
  /**
   * Fetch all insurers including their plans.
   * @param active Whether to filter by active insurers (default: `true`).
   * @returns Observable with the list of insurers and their plans.
   */
  getAllInsurersComplete(active: boolean = true): Observable<Insurer[]> {
    const params = new HttpParams().set('active', String(active));
    return this.http.get<Insurer[]>(`${this.API_URL}/complete/search`, { params });
  }
}
