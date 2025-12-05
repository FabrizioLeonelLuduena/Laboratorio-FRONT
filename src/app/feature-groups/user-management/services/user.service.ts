import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { catchError, map, Observable, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { InternalUser } from '../models/InternalUser';
import { PaginatedResponseDTO } from '../models/PaginatedResponseDTO';
import { UpdatedUserResponseDTO } from '../models/UpdatedUserResponseDTO';
import { UpdateUserRequestDTO } from '../models/UpdateUserRequestDTO';

/**
 * Format a role description string coming from backend.
 * Replaces underscores with spaces and returns a capitalized string.
 */
function formatRoleDescription(value: string | undefined | null): string {
  if (!value) return '';
  const withSpaces = String(value).replace(/_/g, ' ');
  return withSpaces;
}

/**
 * Service responsible for handling user-related operations.
 *
 * Provides methods to interact with the backend API for user registration.
 * Uses Angular's HttpClient for HTTP requests.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  /**
   * Base URL for authentication-related API endpoints.
   */
  private apiUrl = `${environment.apiUrl}/v1/user`;

  /**
   * Creates an instance of UserService.
   *
   * @param http Angular HttpClient used to perform HTTP requests
   */
  constructor(private http: HttpClient) {
  }

  /**
   * Retrieves all internal users from the backend API.
   *
   * Sends an HTTP GET request to the `/getAll` endpoint and returns
   * an observable stream containing the list of users.
   * If an error occurs, it emits an `Error` with a descriptive message.
   *
   * @returns {Observable<InternalUser[]>} An observable that emits an array of internal users.
   * @throws {Error} If the request fails or the server returns an error.
   *
   * @example
   * this.userService.getAllUsers().subscribe({
   *   next: (users) => console.log('Users:', users),
   *   error: (err) => console.error('Failed to load users:', err.message)
   * });
   */
  getAllUsers(): Observable<InternalUser[]> {
    return this.http.get<InternalUser[]>(`${this.apiUrl}/getAll`)
      .pipe(
        catchError(err => {
          const message = err.error?.message || 'Error al traer usuarios';
          return throwError(() => new Error(message));
        })
      );
  }

  /**
   * Busca usuarios aplicando filtros, paginación y ordenamiento.
   *
   * @param params Objeto con filtros opcionales:
   *  - search: término general
   *  - isActive: boolean
   *  - isExternal: boolean
   *  - role: string
   *  - sortBy: string
   *  - sortDirection: 'ASC' | 'DESC'
   *  - page: number
   *  - size: number
   *  - createdFrom, createdTo, updatedFrom, updatedTo: ISO date strings
   *
   * @returns Observable con los resultados paginados
   */
  searchUsers(params: {
    page: number;
    size: number;
    sortBy: string | string[];
    sortDirection: string;
    search: string;
    isActive: boolean | null;
    isExternal: boolean | null;
    roleId: number[] | null;
  }): Observable<PaginatedResponseDTO<InternalUser>> {

    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => {
            httpParams = httpParams.append(key, v.toString());
          });
        } else if (!Array.isArray(value)) {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });

    return this.http.get<PaginatedResponseDTO<InternalUser>>(`${this.apiUrl}/search`, { params: httpParams }).pipe(
      // Normalize role descriptions so UI displays readable names (replace '_' with ' ' and capitalize)
      map((paginated) => {
        if (!paginated || !Array.isArray(paginated.content)) return paginated;
        const formatted = {
          ...paginated,
          content: paginated.content.map(user => ({
            ...user,
            roles: Array.isArray(user.roles) ? user.roles.map(r => ({
              ...r,
              description: formatRoleDescription(r.description)
            })) : user.roles
          }))
        } as PaginatedResponseDTO<InternalUser>;
        return formatted;
      }),
      catchError(err => {
        const message = err.error?.message || 'Error al traer usuarios';
        return throwError(() => new Error(message));
      })
    );
  }
  /**
   *  Updates an existing internal user by sending a PATCH request to the backend.
   * @param id - The ID of the user to update.
   * @param editedUser - The edited user data to update.
   *
   * @returns Observable that emits the updated `UserResponse` object.
   */
  updateUser(id: number | string, editedUser: Partial<UpdateUserRequestDTO> ): Observable<UpdatedUserResponseDTO> {
    const url = `${this.apiUrl}/edit/${id}`;
    return this.http.put<UpdatedUserResponseDTO>(url, editedUser);
  }

  /**
   * Updates the active status of a user.
   *
   * @param userId ID of the user to update
   * @param isActive New active status (true = active, false = inactive)
   * @param reason Reason for the status change
   * @returns Observable that emits the updated InternalUser object
   */
  updateUserStatus(userId: number, isActive: boolean, reason: string): Observable<InternalUser> {
    const _apiUrl = `${this.apiUrl}/${userId}/status`;
    return this.http.patch<InternalUser>(_apiUrl, { isActive, reason })
      .pipe(
        catchError(err => {
          const message = err.error?.message || 'Error al actualizar el estado del usuario';
          return throwError(() => new Error(message));
        })
      );
  }
}
