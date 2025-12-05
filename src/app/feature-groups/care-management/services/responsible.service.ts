import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


/**
 * Service to post and get responsibles for a branch.
 */
@Injectable({
  providedIn: 'root'
})
export class ResponsibleService {
  /**
   * Injection of HttpClient.
   */
  constructor(private http: HttpClient) {}
  private apiUrl: string = `${environment.apiUrl}/v2/configurations/responsibles`;

  /**
   * Create a new responsible and get the generated id.
   * @param responsibleName
   */
  postResponsible(responsibleName: string): Observable<number> {
    return this.http.post<number>(this.apiUrl, { name: responsibleName });
  }

  /**
   * Get all responsibles from the database.
   */
  getAllResponsibles(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((rawResponsibles: any[]) =>
        rawResponsibles.map((rawResponsible: any) => ({
          id: rawResponsible.id,
          responsibleName: rawResponsible.name
        }))
      )
    );
  }
}
