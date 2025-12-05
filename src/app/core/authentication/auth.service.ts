import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, Observable, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, UserResponse } from 'src/app/feature-groups/user-management/models/login-model';

import { environment } from '../../../environments/environment';
import {
  InternalUserRegisterRequestDTO
} from '../../feature-groups/user-management/models/InternalUserRegisterRequestDTO';
import {
  InternalUserRegisterResponseDTO
} from '../../feature-groups/user-management/models/InternalUserRegisterResponseDTO';

/**
 * AuthService
 * Service to handle user authentication and token storage in localStorage.
 * Provides methods for login, logout, checking authentication status,
 * retrieving user information, and decoding JWT tokens.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public errorMsg: string | null = null;
  private router = inject(Router);
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/auth`;

  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  private firstLoginToken = 'first_login_token';
  private firstLoginTokenCamelCase = 'firstLoginToken';

  private sessionExpiredMessage = signal<string | null>(null);
  /** Signal that emits a message when the session expires. Read-only. */
  public sessionExpiredMessage$ = this.sessionExpiredMessage.asReadonly();

  /** Signal que contiene los roles normalizados extraídos del JWT. */
  private rolesSignal = signal<string[]>(this.getUserRoles());
  /** Señal pública readonly para que componentes puedan leer roles reactivos. */
  public roles = this.rolesSignal.asReadonly();

  /**
   * Handles user login by sending credentials to the backend.
   * On successful login, stores the token and user information in localStorage.
   * @param credentials - The login credentials (username and password).
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    // The API URL is constructed using the environment variable to ensure portability across environments.
    const url = `${this.apiUrl}/internal/login`;
    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        // Verifys if the user is active
        if (response.user?.isActive === false) {
          throw new Error('El usuario no está activo.');
        }
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
        }
        if (response.user) {
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
        }
        // If the backend returns a specific token for the first login, save it.
        if (response.user?.isFirstLogin) {
          const flToken = response.firstLoginToken ?? (response as any)['firstLoginToken'];
          if (flToken) {
            localStorage.setItem(this.firstLoginToken, flToken);
          }
        }
        // Actualiza la señal de roles tras un login exitoso (hacerlo antes de navegar)
        try { this.rolesSignal.set(this.getUserRoles()); } catch { this.rolesSignal.set([]); }
        // Handles post-login redirection
        this.handlePostLoginRedirect(response);
      })
    );
  }

  /**
   * Handles post-login redirection based on whether it's the user's first login.
   * @param response - The login response containing user details and token.
   */
  private handlePostLoginRedirect(response: LoginResponse): void {
    if (!response.user) return;

    if (response.user.isFirstLogin) {
      // Redirect to the password reset component with the specific first-login token
      const flToken = response.firstLoginToken ?? (response as any)['firstLoginToken'] ?? localStorage.getItem(this.firstLoginToken);
      this.router.navigate(['/password-reset'], {
        queryParams: { first: true, firstLoginToken: flToken, userId: response.user?.id }
      });
    } else {
      this.redirectToDashboard();
    }
  }

  /**
   * Marks the first login as completed by updating the user data in localStorage
   * and clearing the first-login token.
   */
  markFirstLoginCompleted(): void {
    const user = this.getUser();
    if (user) {
      user.isFirstLogin = false;
      // Update user in localStorage
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    // Clear first-login tokens (both snake_case and camelCase for robustness)
    localStorage.removeItem(this.firstLoginToken);
    localStorage.removeItem(this.firstLoginTokenCamelCase);
    // Actualizar roles por si el estado del usuario cambió
    try { this.rolesSignal.set(this.getUserRoles()); } catch { this.rolesSignal.set([]); }
  }

  /**
   * Redirects to the main dashboard
   */
  redirectToDashboard(): void {
    // Obteins users hierarchy (0 = ADMINISTRADOR → highest hierarchy)
    const hierarchy = this.getUserRolesHierarchy();

    // If hierarchy is null, redirect to home
    if (hierarchy === null) {
      this.router.navigate(['']);
      return;
    }

    // Redirects to dashboards based on roles hierarchy
    switch (hierarchy) {
    case 0: // ADMINISTRADOR
      this.router.navigate(['/dashboard']); //TODO: change to dashboards when ready
      break;
    case 1: // FACTURISTA, SECRETARIA, RESPONSABLE_SECRETARIA
      this.router.navigate(['/care-management']);
      break;
    case 2: // TECNICO_LABORATORIO, BIOQUIMICO
      this.router.navigate(['/analytical-management']);
      break;
    case 3: // MANAGER_STOCK, OPERADOR_COMPRAS
      this.router.navigate(['/procurement-inventory']);
      break;
    case 4: // EXTERNO (no interactúa con interno) → llevar al home o a una vista neutral
      this.router.navigate(['']);
      break;
    default:
      // Fallback seguro al home
      this.router.navigate(['']);
    }
  }

  /**
   * Delete the token and user from localStorage and navigate to login
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.firstLoginToken);


    this.router.navigate(['/login']); // login redirect
    // Notificar que ya no hay roles disponibles
    try { this.rolesSignal.set([]); } catch { this.rolesSignal.set([]); }
  }

  /**
   * Checks if the user is logged in by verifying the presence of a token in localStorage
   * @returns true if a token exists, false otherwise
   */
  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  /**
   * Checks if the JWT token is expired.
   * @returns true if the token is expired, false otherwise.
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const payload = this.decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    const expiry = Number(payload.exp) * 1000;
    if (Number.isNaN(expiry)) return true;
    return Date.now() >= expiry;
  }

  /**
   * Returns the token stored in localStorage
   */
  getToken(): string | null {
    const raw = localStorage.getItem(this.tokenKey);
    if (!raw) return null;
    let token = raw.trim();
    // Remove surrounding double quotes if present
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).trim();
    }
    return token || null;
  }

  /**
   * Returns the user object stored in localStorage, or null if not found
   */
  getUser(): UserResponse | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Updates the user object in localStorage
   * @param user - Updated user data
   */
  updateUserInStorage(user: UserResponse): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Decodifys the JWT token and returns the array of roles_id of the user
   */
  getUserRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];
    try {
      const payload = this.decodeJwtPayload(token);
      if (!payload) return [];

      // The backend may return roles in different shapes:
      // - ['ADMINISTRADOR', 'FACTURISTA']
      // - [{ name: 'ADMINISTRADOR' }, { name: 'FACTURISTA' }]
      // - 'ADMINISTRADOR,FACTURISTA'
      // Normalize to string[] uppercased.
      let raw: any = payload.roles ?? payload.role ?? [];

      if (!Array.isArray(raw)) {
        if (typeof raw === 'string') {
          raw = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (raw === undefined || raw === null) {
          raw = [];
        } else {
          raw = [raw];
        }
      }

      const normalized = raw.map((r: any) => {
        if (typeof r === 'string') return r.trim().toUpperCase();
        if (typeof r === 'number') return String(r);
        if (r && typeof r === 'object') {
          const candidate = r.name ?? r.code ?? r.role ?? r.roleName ?? r.role_name ?? r.value ?? r.label;
          if (candidate) return String(candidate).trim().toUpperCase();
          try { return JSON.stringify(r); } catch { return String(r); }
        }
        return String(r);
      }).filter((x: string) => !!x);

      return Array.from(new Set(normalized));
    } catch {
      this.errorMsg = 'Error al decodificar el rol del token JWT.';
      return [];
    }
  }

  /**
   * Extracts and returns the user's roles hierarchy from the JWT token.
   * @returns The roles hierarchy as a number, or null if not found or invalid.
   * @throws {Error} If there's an error decoding the token.
   */
  getUserRolesHierarchy(): number | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.decodeJwtPayload(token);
    if (!payload) return null;
    const raw = payload.roles_hierarchy ?? payload.rolesHierarchy ?? payload.roles_h ?? payload.role_hierarchy;
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    const maybeNumber = Number(raw);
    return Number.isNaN(maybeNumber) ? null : maybeNumber;
  }

  /**
   * Gets the token expiration date as a string
   */
  getTokenExpiration(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.decodeJwtPayload(token);
    if (payload && payload.exp) {
      const expDate = new Date(Number(payload.exp) * 1000);
      return expDate.toLocaleString();
    }

    // Decoding failed or no exp claim: return null (don't set global error here)
    return null;
  }

  /**
   * Decodes the JWT payload in a robust way.
   * Supports tokens with a `Bearer ` prefix and base64url encoding.
   * Returns the parsed payload object, or `null` if decoding fails.
   */
  private decodeJwtPayload(token: string): any | null {
    if (!token) return null;
    try {
      let t = token;

      // If token is a JSON string containing the token, extract common fields
      if (t.startsWith('{')) {
        try {
          const parsed = JSON.parse(t);
          // common names: token, accessToken, authToken
          const candidate = parsed.token ?? parsed.accessToken ?? parsed.authToken ?? parsed?.data?.token;
          if (candidate && typeof candidate === 'string') t = candidate.trim();
        } catch {
          // fallthrough: not a JSON object we can use
        }
      }

      // Remove Bearer prefix if present
      if (t.startsWith('Bearer ')) t = t.slice(7).trim();

      const parts = t.split('.');
      if (parts.length < 2) return null;
      let payload = parts[1];
      // Convert base64url to base64
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Pad with '=' to make length a multiple of 4
      while (payload.length % 4 !== 0) payload += '=';
      const json = atob(payload);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Registers a new internal user by sending a POST request to the backend.
   *
   * @param internalUserRequestDto Data Transfer Object containing user registration details
   * @returns Observable that emits an `InternalUserRegisterResponseDTO` object with the following fields:
   * - `id`: number → Unique identifier of the registered user
   * - `firstName`: string → User's first name
   * - `lastName`: string → User's last name
   * - `document`: string → User's document/ID number
   * - `email`: string → User's email address
   * - `userName`: string → Username created for the user
   * - `isActive`: boolean → Indicates whether the user account is active
   * - `message`: string → Response message from the backend (e.g., success or error message)
   *
   * @example
   * const request: InternalUserRegisterRequestDTO = {
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   document: 44567823,
   *   email: 'john.doe@example.com',
   *   username: 'johndoe',
   *   password: 'securePass123',
   *   role: [1, 3, 4],
   *   branch: 1
   * };
   */
  registerUser(internalUserRequestDto: InternalUserRegisterRequestDTO): Observable<InternalUserRegisterResponseDTO>{
    const _apiUrl = `${this.apiUrl}/internal/register`;
    return this.http.post<InternalUserRegisterResponseDTO>(_apiUrl, internalUserRequestDto)
      .pipe(
        catchError(err => {
          const message = err.error?.message;
          return throwError(() => new Error(message));
        }
        )
      );
  }
}
