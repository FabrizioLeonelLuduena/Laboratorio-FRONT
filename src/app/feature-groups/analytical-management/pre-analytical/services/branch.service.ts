import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment.production';
import { BranchResumeDTO, BranchResponseDTO } from '../models/branch.interface';

/**
 * Service for managing branch-related operations
 */
@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly baseUrl = `${environment.apiUrl}/v2/configurations/branches`;

  /**
   *  Constructor of the service
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves a summarized list of all branches
   * @returns Observable with list of branch resume DTOs
   */
  getAllResumeBranches(): Observable<BranchResumeDTO[]> {
    return this.http.get<BranchResumeDTO[]>(`${this.baseUrl}/resume`);
  }

  /**
   * Retrieves a specific branch by ID with areas and sections
   * @param branchId - The branch identifier
   * @returns Observable with branch response DTO including areas
   */
  getAreasAndSectionsByBranch(branchId: number): Observable<BranchResponseDTO> {
    return this.http.get<BranchResponseDTO>(`${this.baseUrl}/${branchId}`);
  }
}
