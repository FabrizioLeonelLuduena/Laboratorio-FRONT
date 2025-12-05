import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { UpdateAreaRelationRequest } from '../models/area.models';

/**
 * @Injectable
 * @description Service for managing workspaces.
 */
@Injectable({ providedIn: 'root' })
export class WorkspacesService {
  /**
   * HttpClient injection.
   * @constructor
   * @param {HttpClient} http - The HTTP client.
   */
  constructor(private http: HttpClient) {}

  private apiUrl = `${environment.apiUrl}/v2/configurations/workspaces`;

  /**
   * Updates relations (sections) for a single area in a branch.
   * Backend endpoint expects one request per area.
   */
  updateRelation(payload: UpdateAreaRelationRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/update/relations`, payload);
  }
}
