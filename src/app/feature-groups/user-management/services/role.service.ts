import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RolesResponseDTO } from '../models/RolesResponseDTO';

/**
 * Service for managing user roles.
 */
@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private apiUrl = `${environment.apiUrl}/v1/role`;

  /**
   * Formats a role string from 'ROLE_NAME' to 'Role name'.
   */
  private formatRole(value: string): string {
    if (!value) return '';
    let formatted = value.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  }

  /**
   * Initializes the RolesService with the HTTP client.
   *
   * @param http Angular HttpClient for performing HTTP requests
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves all available roles for users.
   *
   * @returns {Observable<RolesResponseDTO[]>} An observable that emits a list of roles.
   *
   * The response contains:
   * - **id**: Unique identifier of the role.
   * - **description**: Textual description of the role.
   */
  getAll(): Observable<RolesResponseDTO[]> {
    return this.http.get<RolesResponseDTO[]>(`${this.apiUrl}/`).pipe(
      map((roles) =>
        roles.map((r) => ({
          ...r,
          description: this.formatRole(r.description)
        }))
      )
    );
  }

}
