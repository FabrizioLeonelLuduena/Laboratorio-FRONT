import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { RoleResponse } from '../models/employees.models';


/**
 * Service to get all roles for a user.
 */
@Injectable({
  providedIn: 'root'
})
export class RolesService {

  /**
   * HttpClient injection.
   */
  constructor(private http: HttpClient) { }

  private apiUrl: string = `${environment.apiUrl}/v1/role/`;

  /**
   * Get all the possible roles to add at users.
   */
  getAllRoles(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.apiUrl);
  }
}
