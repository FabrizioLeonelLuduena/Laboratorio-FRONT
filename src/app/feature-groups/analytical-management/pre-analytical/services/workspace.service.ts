import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AreaDTO, SectionDTO } from '../../analytical/models/area.interface';

/**
 * Workspace Area DTO response from GET /workspaces/by-branch/{branchId}/areas
 */
export interface WorkspaceAreaDTO {
  /**
   * Workspace ID
   */
  workspaceId: number;

  /**
   * Area information
   */
  area: AreaDTO;
}

/**
 * Workspace Section DTO response from GET /workspaces/by-branch/{branchId}/by-area/{areaId}/section
 */
export interface WorkspaceSectionDTO {
  /**
   * Workspace ID
   */
  workspaceId: number;

  /**
   * Section information
   */
  section: SectionDTO;
}

/**
 * Service for managing workspace-related operations from Configuration Management
 */
@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly baseUrl = `${environment.apiUrl}/v2/configurations/workspaces`;

  /**
   * Constructor
   * @param http - HTTP client for API calls
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves areas by branch ID
   * @param branchId - The branch identifier
   * @returns Observable with list of workspace area DTOs
   */
  getAreasByBranch(branchId: number): Observable<WorkspaceAreaDTO[]> {
    return this.http.get<WorkspaceAreaDTO[]>(`${this.baseUrl}/by-branch/${branchId}/areas`);
  }

  /**
   * Retrieves sections by branch ID and area ID
   * @param branchId - The branch identifier
   * @param areaId - The area identifier
   * @returns Observable with list of workspace section DTOs
   */
  getSectionsByBranchAndArea(branchId: number, areaId: number): Observable<WorkspaceSectionDTO[]> {
    return this.http.get<WorkspaceSectionDTO[]>(
      `${this.baseUrl}/by-branch/${branchId}/by-area/${areaId}/section`
    );
  }
}
