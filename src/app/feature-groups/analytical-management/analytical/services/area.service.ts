import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { forkJoin, Observable, of, shareReplay } from 'rxjs';

import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { AreaDTO, SectionDTO } from '../models/area.interface';

/**
 * Service for managing areas and sections in the analytical management module.
 * Provides methods for retrieving areas and their associated sections.
 */
@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v2/configurations`;

  // Cache observables to prevent duplicate HTTP calls
  private areasCache$?: Observable<AreaDTO[]>;
  private sectionsCache$?: Observable<SectionDTO[]>;

  /**
   * Retrieves all areas.
   * Results are cached to prevent duplicate HTTP calls.
   * @returns {Observable<AreaDTO[]>} An observable that emits an array of areas.
   */
  getAllAreas(): Observable<AreaDTO[]> {
    if (!this.areasCache$) {
      this.areasCache$ = this.http.get<AreaDTO[]>(`${this.apiUrl}/areas`).pipe(
        shareReplay(1) // Cache the result and share with all subscribers
      );
    }
    return this.areasCache$;
  }

  /**
   * Alias for getAllAreas() - for compatibility
   * @returns {Observable<AreaDTO[]>} An observable that emits an array of areas.
   */
  getAreas(): Observable<AreaDTO[]> {
    return this.getAllAreas();
  }

  /**
   * Retrieves a specific area by ID.
   * @param {number} id - The unique identifier of the area.
   * @returns {Observable<AreaDTO>} An observable that emits the area details.
   */
  getAreaById(id: number): Observable<AreaDTO> {
    return this.http.get<AreaDTO>(`${this.apiUrl}/areas/${id}`);
  }

  /**
   * Retrieves all sections for a specific area.
   * @param {number} areaId - The unique identifier of the area.
   * @returns {Observable<SectionDTO[]>} An observable that emits an array of sections.
   */
  getSectionsByArea(areaId: number): Observable<SectionDTO[]> {
    return this.http.get<SectionDTO[]>(`${this.apiUrl}/areas/${areaId}/sections`);
  }

  /**
   * Retrieves all sections from all active areas.
   * Results are cached to prevent duplicate HTTP calls.
   * This method fetches all areas first, then retrieves sections for each area.
   * @returns {Observable<SectionDTO[]>} An observable that emits all sections across all areas.
   */
  getAllSections(): Observable<SectionDTO[]> {
    if (!this.sectionsCache$) {
      this.sectionsCache$ = this.getAllAreas().pipe(
        switchMap(areas => {
          const activeAreas = areas.filter(area => area.isActive);

          // Return empty array if no active areas
          if (activeAreas.length === 0) {
            return of([]);
          }

          // Create array of observables for each area's sections
          const sectionRequests = activeAreas.map(area =>
            this.getSectionsByArea(area.id).pipe(
              map(sections => sections.filter(section => section.isActive))
            )
          );

          // Use forkJoin to wait for all requests and combine results
          return forkJoin(sectionRequests).pipe(
            map(sectionsArrays => {
              // Flatten array of arrays into single array
              return sectionsArrays.reduce((acc, sections) => [...acc, ...sections], []);
            })
          );
        }),
        shareReplay(1) // Cache the result
      );
    }
    return this.sectionsCache$;
  }

  /**
   * Clears the cache, forcing new HTTP calls on next request.
   * Use this when you know the data has changed on the server.
   */
  clearCache(): void {
    this.areasCache$ = undefined;
    this.sectionsCache$ = undefined;
  }
}
