import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CoverageMappers } from '../mappers/mappers';
import { PlanCompleteResponseDTO, PlanResponseDTO, PlanUpdateRequestDTO } from '../models/plan.model';


/**
 * Insurer Plans Service
 * Handles CRUD operations for insurer plans and their coverages.
 * All comments and documentation are in English as requested.
 */
@Injectable({ providedIn: 'root' })
export class InsurerPlansService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/plans`;


  /**
   * constructor
   */
  constructor(private http: HttpClient) { }


  /**
   * Retrieves all plans that an insurer has associated to it (complete, with coverages)
   */
  getPlansByInsurer(insurerId: number): Observable<PlanCompleteResponseDTO[]> {
    return this.http
      .get<PlanCompleteResponseDTO[]>(`${this.API_URL}/complete/search?insurerId=${insurerId}`);
  }

  /** Updates a plan */
  updatePlan(id: number, payload: PlanUpdateRequestDTO): Observable<PlanResponseDTO> {
    return this.http
      .put<PlanResponseDTO>(`${this.API_URL}/${id}`, payload)
      .pipe(map((p) => CoverageMappers.mapPlanResponse(p)));
  }

  /** Soft delete */
  deactivatePlan(id: number): Observable<PlanResponseDTO> {
    return this.http
      .put<PlanResponseDTO>(`${this.API_URL}/deactivate/${id}`, {});
  }

  /** Activate */
  activatePlan(id: number): Observable<PlanResponseDTO> {
    return this.http
      .put<PlanResponseDTO>(`${this.API_URL}/activate/${id}`, {});
  }

  /**
   * Retrieves the plan information by id (complete, with coverages)
   */
  getPlanById(id: number): Observable<PlanCompleteResponseDTO> {
    return this.http
      .get<PlanCompleteResponseDTO>(`${this.API_URL}/complete/${id}`);
  }

}
