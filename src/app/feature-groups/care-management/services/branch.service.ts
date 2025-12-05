import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { catchError, map, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Address } from '../models/address';
import { AreaResponse } from '../models/area.models';
import { BranchResponse, BranchResume } from '../models/branch';
import { BranchRequest, BranchUpdateRequest } from '../models/branch-request';
import {
  BranchDetailResponseDTO,
  BranchOption,
  BranchResponseDTO,
  ContactDTO,
  PaginatedBranchResponseDTO,
  ScheduleDTO
} from '../models/branches';
import { Contact } from '../models/contact';
import { Responsible } from '../models/responsible';
import { Schedule } from '../models/schedule';

/**
 * Service configuration.
 */
@Injectable({
  providedIn: 'root'
})
/**
 * Service to access to the branch's backend.
 */
export class BranchService {
  /**
   * Constructor that injects HttpClient.
   * @param http The HttpClient instance.
   */
  constructor(private http: HttpClient) {}
  private apiUrl = `${environment.apiUrl}/v2/configurations/branches`;

  /**
   * This method hit the getAllPaginated api's endpoint.
   * @param filters Filters for the query.
   * @param page Page number.
   * @param size Page size.
   * @param sort Sorting criteria.
   * @returns An observable with the paginated branches.
   */
  getAllBranches(
    filters: { nombre?: string; estado?: string } = {},
    page: number = 0,
    size: number = 10,
    sort: string = 'id,asc'
  ): Observable<{ content: any[]; totalElements: number }> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);

    if (filters.nombre) params = params.set('nombre', filters.nombre);
    if (filters.estado) params = params.set('estado', filters.estado);

    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      MAINTENANCE: 'Mantenimiento'
    };

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map((response: any) => ({
        content: response.content.map((raw: any) => ({
          id: raw.id,
          code: raw.code,
          description: raw.description,
          responsibleName: raw.responsibleName,
          fullAddress: raw.fullAddress,
          latitude: raw.latitude,
          longitude: raw.longitude,
          status: statusMap[raw.status] || raw.status,
          boxCount: raw.boxCount,
          schedules: Array.isArray(raw.schedules) ? raw.schedules : []
        })),
        totalElements: response.totalElements
      }))
    );
  }

  /**
   *  this method hit the getById api's endpoint.
   * @param id The ID of the branch.
   * @returns An observable with the branch data.
   */
  getBranchById(id: number): Observable<any> {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      MAINTENANCE: 'Mantenimiento'
    };

    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((raw: any) => {
        // Extract phone and email from contacts array
        const contacts = Array.isArray(raw.contacts) ? raw.contacts : [];
        const phoneContact = contacts.find((c: any) => c.contactType === 'PHONE');
        const emailContact = contacts.find((c: any) => c.contactType === 'EMAIL');

        return {
          id: raw.id,
          code: raw.code,
          description: raw.description,
          responsibleName: raw.responsibleName,
          fullAddress: raw.fullAddress,
          latitude: raw.latitude,
          longitude: raw.longitude,
          status: statusMap[raw.status] || raw.status,
          boxCount: raw.boxCount,
          assistantDesk: raw.assistantDesk ?? raw.asistantDesk,
          schedules: Array.isArray(raw.schedules) ? raw.schedules : [],
          contacts: contacts,
          contactInfo: {
            phoneNumber: phoneContact?.contact || null,
            email: emailContact?.contact || null
          }
        };
      })
    );
  }

  /**
   *  this method hit the delete api's endpoint.
   * @param id The ID of the branch to delete.
   * @returns An observable that completes on deletion.
   */
  deleteBranch(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url);
  }

  /**
   *  this method hit the post api's endpoint.
   * @param branch The branch data to create.
   * @returns An observable that completes on creation.
   */
  postBranch(branch: BranchRequest): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.apiUrl}`, branch, {
      observe: 'response'
    });
  }

  /**
   *  this method hit the put api's endpoint.
   * @param id The ID of the branch to update.
   * @param branch The branch data to update.
   * @returns An observable that completes on update.
   */
  updateBranch(id: number, branch: BranchUpdateRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, branch);
  }

  /**
   * Retrieves summarized branch data for dashboards.
   * Hits: GET `${apiUrl}/resume`
   */
  getBranchesResume(): Observable<BranchResume[]> {
    const url = `${this.apiUrl}/resume`;
    return this.http.get<BranchResume[]>(url).pipe(
      map(list => Array.isArray(list) ? list : []),
      catchError(() => of<BranchResume[]>([]))
    );
  }

  /**
   * Returns branch options (id + description).
   * It handles responses as a simple array or as a Page<BranchResponseDTO>.
   * Includes fallback data in case of error.
   * @returns An observable with branch options.
   */
  getBranchOptions(): Observable<BranchOption[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => this.extractBranches(res)),
      map((branches) => this.toOptions(branches)),
      map((options) => this.uniqueAndSorted(options)),
      catchError(() => {
        return of<BranchOption[]>([]);
      })
    );
  }

  /** Type guard to Page<BranchResponseDTO> */
  private isPaginated(res: any): res is PaginatedBranchResponseDTO {
    return (
      !!res &&
      Array.isArray(res.content) &&
      typeof res.totalElements === 'number'
    );
  }

  /** Extract an array of BranchResponseDTO from an array or page. */
  private extractBranches(res: any): BranchResponseDTO[] {
    if (Array.isArray(res)) return res as BranchResponseDTO[];
    if (this.isPaginated(res)) return res.content as BranchResponseDTO[];
    return [];
  }

  /** Maps BranchResponseDTO[] to BranchOption[] */
  private toOptions(branches: BranchResponseDTO[]): BranchOption[] {
    return (branches ?? [])
      .filter(Boolean)
      .map((b) => ({ id: b.id, description: b.description }));
  }

  /** Remove duplicates by ID and sort by description*/
  private uniqueAndSorted(list: BranchOption[]): BranchOption[] {
    const byId = new Map<number, BranchOption>();
    for (const item of list) byId.set(item.id, item);
    return Array.from(byId.values()).sort((a, b) =>
      (a.description ?? '').localeCompare(b.description ?? '', 'es')
    );
  }

  /**
   * Gets the detailed information for a branch by its ID.
   * @param id The ID of the branch.
   * @returns An observable with the detailed branch data.
   */
  getBranchDetailById(id: number): Observable<BranchDetailResponseDTO> {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      MAINTENANCE: 'Mantenimiento'
    };

    return this.http.get<BranchDetailResponseDTO>(`${this.apiUrl}/${id}`).pipe(
      map((raw) => {
        const contacts: ContactDTO[] = Array.isArray(raw.contacts)
          ? raw.contacts
          : [];
        const schedules: ScheduleDTO[] = Array.isArray(raw.schedules)
          ? raw.schedules
          : [];
        const areas: AreaResponse[] = Array.isArray(raw.areas) ? raw.areas : [];

        const mapped: BranchDetailResponseDTO = {
          id: Number(raw.id),
          code: raw.code ?? '',
          description: raw.description ?? '',
          status: statusMap[String(raw.status)] || raw.status || '',

          responsibleName: raw.responsibleName ?? '',
          fullAddress: raw.fullAddress ?? '',

          latitude: raw.latitude ?? 0,
          longitude: raw.longitude ?? 0,
          boxCount: Number(raw.boxCount ?? 0),
          registerCount: Number(raw.registerCount ?? 0),

          contacts,
          schedules,
          areas
        };

        return mapped;
      })
    );
  }

  /**
   * Gets branch details by ID using the v2 details endpoint and maps it
   * to the legacy BranchResponse model expected by the edit form.
   * Backend note: contacts and schedules come without ids; generate them.
   */
  getByIdDetail(id: number): Observable<BranchResponse> {
    // Endpoint provided by backend: .../branches/{id}/deatails (spelled as given)
    const url = `${this.apiUrl}/${id}/details`;
    return this.http.get<any>(url).pipe(
      map((raw): BranchResponse => {
        const responsible: Responsible | undefined = raw?.responsible
          ? {
            id: Number(raw.responsible.id ?? 0),
            name: String(raw.responsible.name ?? '')
          }
          : raw?.responsibleName
            ? { id: 0, name: String(raw.responsibleName) }
            : undefined;

        const address: Address | undefined = raw?.address
          ? {
            id: Number(raw.address.id ?? 0),
            streetName: String(raw.address.streetName ?? ''),
            streetNumber: String(raw.address.streetNumber ?? ''),
            neighborhoodId: Number(raw.address.neighborhoodId ?? 0),
            cityId: Number(raw.address.cityId ?? 0),
            provinceId: Number(raw.address.provinceId ?? 0),
            postalCode: String(raw.address.postalCode ?? ''),
            latitude: Number(raw.address.latitude ?? raw.latitude ?? 0),
            longitude: Number(raw.address.longitude ?? raw.longitude ?? 0)
          }
          : undefined;

        const contacts: Contact[] = Array.isArray(raw?.contacts)
          ? raw.contacts.map((c: any, idx: number) => ({
            id: Number(c?.id ?? idx + 1),
            contactType: String(c?.contactType ?? ''),
            contact: String(c?.contact ?? '')
          }))
          : [];

        const schedules: Schedule[] = Array.isArray(raw?.schedules)
          ? raw.schedules.map((s: any, idx: number) => ({
            id: Number(s?.id ?? idx + 1),
            dayFrom: String(s?.dayFrom ?? ''),
            dayTo: String(s?.dayTo ?? ''),
            scheduleFromTime: String(s?.scheduleFromTime ?? ''),
            scheduleToTime: String(s?.scheduleToTime ?? ''),
            scheduleType: String(s?.scheduleType ?? '')
          }))
          : [];

        return {
          id: Number(raw?.id ?? 0),
          code: String(raw?.code ?? ''),
          description: String(raw?.description ?? ''),
          status: String(raw?.status ?? ''),
          boxCount: raw?.boxCount != null ? Number(raw.boxCount) : undefined,
          assistantDesk:
            raw?.assistantDesk != null
              ? Number(raw.assistantDesk)
              : (raw?.asistantDesk != null ? Number(raw.asistantDesk) : undefined),
          registerCount:
            raw?.registerCount != null ? Number(raw.registerCount) : undefined,
          responsible,
          address,
          schedules,
          contacts
        };
      })
    );
  }
}
