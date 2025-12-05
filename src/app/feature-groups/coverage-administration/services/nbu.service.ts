import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GenericSelectOption } from '../../../shared/components/generic-form/generic-form.component';
import { NbuVersionDTO } from '../models/nbu-version.model';

/**
 * NBU Service
 * Handles retrieval and caching of NBU versions for analysis.
 * All comments and documentation are in English as requested.
 */
@Injectable({
  providedIn: 'root'
})
export class NbuService {

  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/analysis`;


  private optionsCache$?: Observable<GenericSelectOption[]>;

  /**
   * constructor
   */
  constructor(private http: HttpClient) {}


  /**
   * getAll
   * Retrieves all NBU versions.
   */
  getAll(): Observable<NbuVersionDTO[]> {
    return this.http.get<NbuVersionDTO[]>(`${this.API_URL}/nbu/versions`);
  }

  /** Options for select (cached) */
  getOptions(): Observable<GenericSelectOption[]> {
    if (!this.optionsCache$) {
      this.optionsCache$ = this.getAll().pipe(
        map(list => list
          .sort((a, b) => (this.yearB(b) - this.yearB(a)) || (this.yearA(b) - this.yearA(a)))
          .map(v => ({
            label: this.buildLabel(v),
            value: v.id
          }))
        ),
        catchError(() => of([])),
        shareReplay(1)
      );
    }
    return this.optionsCache$;
  }

  /** Force refresh if something changes in the backend */
  refreshOptions(): Observable<GenericSelectOption[]> {
    this.optionsCache$ = undefined;
    return this.getOptions();
  }

  // =============== helpers ===============

  /** Base year (publication) with fallback from date */
  private yearA(v: NbuVersionDTO): number {
    const y = Number(v.publicationYear) || 0;
    if (y > 0) return y;
    return this.yearFromDate(v.publicationDate) ?? 0;
  }

  /** Update/end year with fallback */
  private yearB(v: NbuVersionDTO): number {
    const y = Number(v.updateYear) || 0;
    if (y > 0) return y;
    // if there is no update_year, use end_date or repeat publication
    return this.yearFromDate(v.endDate) ?? this.yearA(v);
  }

  /**
   * Extracts the year from an ISO date (yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss)
   */
  private yearFromDate(iso: string | undefined): number | null {
    if (!iso) return null;
    const n = Number(iso.substring(0, 4));
    return Number.isFinite(n) ? n : null;
    // you could also use new Date(iso).getFullYear(), but substring is faster/surer
  }

  /** Builds the label like "2012_2016" with fallbacks */
  private buildLabel(v: NbuVersionDTO): string {
    // if version_code is useful, use it
    const code = (v.versionCode || '').trim();
    if (code && code.toLowerCase() !== 'string') return code;

    const a = this.yearA(v);
    const b = this.yearB(v);
    return a && b ? `${a}_${b}` : a ? `${a}` : `Version ${v.id}`;
  }
}
