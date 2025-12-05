import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { map, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Province DTO returned by the backend (plus an ASCII label for filtering). */
export interface ArgentineProvince { id: number; nombre: string; nombreAscii?: string }

/** City/Municipality DTO returned by the backend (plus an ASCII label for filtering). */
export interface ArgentineCity { id: number; provinceId: number; nombre: string; nombreAscii?: string }

/**
 * Service that fetches provinces and cities and normalizes the responses so they
 * can be bound directly to PrimeNG select components. Results are cached in memory
 * to avoid repeated HTTP calls during the session.
 */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v2/configurations`;

  private provincesCache?: ArgentineProvince[];
  private citiesCache: Record<string, ArgentineCity[]> = {};

  /** Normalizes text to lowercase ASCII (removes accents) to ease filtering. */
  private normalizeAscii(s?: string | null): string {
    const value = s ?? '';
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Safely unwraps an array from common API response shapes:
   *  - direct array
   *  - object with { provinces } | { provincias } | { data }
   */
  private unwrapArray<T>(res: any, candidates: string[]): T[] {
    if (Array.isArray(res)) return res as T[];
    for (const key of candidates) {
      if (Array.isArray(res?.[key])) return res[key] as T[];
    }
    return [];
  }

  /** Maps a raw province payload into the model consumed by the select. */
  private mapProvince(raw: any): ArgentineProvince {
    const nombre = raw?.province_name ?? raw?.provinceName ?? raw?.name ?? raw?.nombre ?? '';
    const rawId = raw?.province_id ?? raw?.provinceId ?? raw?.id ?? raw?.idProvince;
    const id = rawId != null ? Number(rawId) : NaN;
    return {
      id,
      nombre,
      nombreAscii: this.normalizeAscii(nombre)
    };
  }

  /** Maps a raw city payload into the model consumed by the select. */
  private mapCity(raw: any): ArgentineCity {
    const nombre = raw?.city_name ?? raw?.cityName ?? raw?.name ?? raw?.nombre ?? '';
    const rawProvinceId = raw?.province_id ?? raw?.provinceId ?? raw?.idProvince ?? raw?.province?.id;
    const provinceId = rawProvinceId != null ? Number(rawProvinceId) : NaN;
    const rawId = raw?.city_id ?? raw?.cityId ?? raw?.id ?? raw?.idCity;
    const id = rawId != null ? Number(rawId) : NaN;
    return {
      id,
      provinceId,
      nombre,
      nombreAscii: this.normalizeAscii(nombre)
    };
  }

  /** Retrieves the province list (uses an in-memory cache once fetched). */
  getProvinces(): Observable<ArgentineProvince[]> {
    if (this.provincesCache) return of(this.provincesCache);
    return this.http.get<any>(`${this.baseUrl}/provinces`).pipe(
      map((res) => this.unwrapArray<any>(res, ['provinces', 'provincias', 'data']).map((p) => this.mapProvince(p))),
      tap((list) => (this.provincesCache = list))
    );
  }

  /**
   * Retrieves the cities/municipalities for a given province (with caching).
   * Accepts the province name as provided by the select and filters by its id when available.
   */
  getCitiesByProvince(provinceName: string): Observable<ArgentineCity[]> {
    const provinceId = this.provincesCache?.find((p) => p.nombre === provinceName)?.id;
    const cacheKey = provinceId != null ? String(provinceId) : provinceName;
    if (cacheKey && this.citiesCache[cacheKey]) return of(this.citiesCache[cacheKey]);

    return this.http.get<any>(`${this.baseUrl}/cities`).pipe(
      map((res) => {
        const mapped = this.unwrapArray<any>(res, ['cities', 'municipios', 'data']).map((c) => this.mapCity(c));
        return provinceId ? mapped.filter((c) => c.provinceId === provinceId) : mapped;
      }),
      tap((list) => {
        if (cacheKey) this.citiesCache[cacheKey] = list;
      })
    );
  }
}
