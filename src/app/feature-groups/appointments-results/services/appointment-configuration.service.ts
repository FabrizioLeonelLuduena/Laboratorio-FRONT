import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, BehaviorSubject, map, catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AppointmentConfiguration,
  CreateAppointmentConfiguration,
  UpdateAppointmentConfiguration,
  AvailableAppointment,
  AvailabilityQuery,
  ErrorApi,
  HttpErrorResponse
} from '../models';


/**
 * Service for managing appointment configurations and availability.
 * Handles all HTTP operations related to appointment configuration CRUD operations
 * and availability queries.
 * The case converter interceptor automatically handles camelCase/snake_case conversion.
 *
 * @example
 * ```typescript
 * constructor(private appointmentService: AppointmentConfigurationService) {}
 *
 * // Get available appointments
 * this.appointmentService.getAvailability({ branchId: 1 }).subscribe(
 *   appointments => console.log(appointments)
 * );
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AppointmentConfigurationService {
  /** HTTP client for making API requests */
  private readonly http = inject(HttpClient);

  /**
   * Base URL for appointment configuration endpoints
   * Uses environment.apiUrl to avoid hardcoding URLs
   */
  private readonly baseUrl = `${environment.apiUrl}/v1/appointment-configurations`;

  /** Subject to track loading state across the application */
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  /** Observable for components to subscribe to loading state */
  public readonly loading$ = this.loadingSubject.asObservable();

  /** Subject to track the currently selected branch */
  private readonly selectedBranchSubject = new BehaviorSubject<number | null>(null);

  /** Observable for components to subscribe to selected branch changes */
  public readonly selectedBranch$ = this.selectedBranchSubject.asObservable();

  /** Subject to track the currently selected configuration (when navigating to availability) */
  private readonly selectedConfigurationSubject = new BehaviorSubject<AppointmentConfiguration | null>(null);

  /** Observable for the selected configuration */
  public readonly selectedConfiguration$ = this.selectedConfigurationSubject.asObservable();

  /**
   * Creates a new appointment configuration.
   *
   * @param configuration - The configuration data to create
   * @returns Observable of the created configuration
   * @throws ErrorApi when creation fails due to validation or conflicts
   */
  createConfiguration(configuration: CreateAppointmentConfiguration): Observable<AppointmentConfiguration> {
    this.setLoading(true);

    return this.http.post<AppointmentConfiguration>(this.baseUrl, configuration).pipe(
      map(response => {
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Updates an existing appointment configuration.
   *
   * @param id - The ID of the configuration to update
   * @param configuration - The updated configuration data
   * @returns Observable of the updated configuration
   * @throws ErrorApi when update fails due to validation, conflicts, or version mismatch
   */
  updateConfiguration(id: number, configuration: UpdateAppointmentConfiguration): Observable<AppointmentConfiguration> {
    this.setLoading(true);

    return this.http.put<AppointmentConfiguration>(`${this.baseUrl}/${id}`, configuration).pipe(
      map(response => {
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Retrieves available appointment slots based on the provided query parameters.
   * This is the main endpoint for end users to see available appointment times.
   *
   * @param query - Query parameters for availability search
   * @returns Observable array of available appointment slots
   * @throws ErrorApi when query parameters are invalid
   */
  getAvailability(query: AvailabilityQuery): Observable<AvailableAppointment[]> {
    this.setLoading(true);

    let params = new HttpParams().set('branchId', query.branchId.toString());

    if (query.date) {
      params = params.set('date', query.date);
    }

    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }

    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }

    return this.http.get<AvailableAppointment[]>(`${this.baseUrl}/availability`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(error => {
          this.setLoading(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Retrieves a specific appointment configuration by ID.
   * Useful for loading configuration details for editing.
   *
   * @param id - The ID of the configuration to retrieve
   * @returns Observable of the requested configuration
   * @throws ErrorApi when configuration is not found
   */
  getConfigurationById(id: number): Observable<AppointmentConfiguration> {
    this.setLoading(true);
    return this.http.get<AppointmentConfiguration>(`${this.baseUrl}/${id}`).pipe(
      map(response => {
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Retrieves all appointment configurations for a specific branch.
   * Useful for administration screens to manage branch configurations.
   *
   * @param branchId - The ID of the branch
   * @param activeOnly - Whether to include only active configurations (default: true)
   * @returns Observable array of configurations for the branch
   */
  getConfigurationsByBranch(branchId: number, activeOnly: boolean = true): Observable<AppointmentConfiguration[]> {
    this.setLoading(true);

    const params = new HttpParams().set('activeOnly', activeOnly.toString());

    return this.http.get<AppointmentConfiguration[]>(
      `${this.baseUrl}/branch/${branchId}`,
      { params }
    ).pipe(
      map(response => {
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Deactivates (soft deletes) an appointment configuration.
   * The configuration will no longer be available for new appointments.
   *
   * @param id - The ID of the configuration to deactivate
   * @param userId - The ID of the user performing the operation
   * @returns Observable that completes when deactivation is successful
   * @throws ErrorApi when deactivation fails or configuration has existing appointments
   */
  deactivateConfiguration(id: number, userId: number): Observable<void> {
    this.setLoading(true);

    const params = new HttpParams().set('userId', userId.toString());

    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params })
      .pipe(
        map(() => {
          this.setLoading(false);
        }),
        catchError(error => {
          this.setLoading(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Reactivates a previously deactivated appointment configuration.
   * The configuration will become available for new appointments again.
   *
   * @param id - The ID of the configuration to reactivate
   * @param userId - The ID of the user performing the operation
   * @returns Observable that completes when reactivation is successful
   * @throws ErrorApi when reactivation fails due to conflicts
   */
  reactivateConfiguration(id: number, userId: number): Observable<void> {
    this.setLoading(true);

    const params = new HttpParams().set('userId', userId.toString());

    return this.http.patch<void>(`${this.baseUrl}/${id}/reactivate`, null, { params })
      .pipe(
        map(() => {
          this.setLoading(false);
        }),
        catchError(error => {
          this.setLoading(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Sets the currently selected branch for the application.
   * This is used by components to track which branch is being managed.
   *
   * @param branchId - The ID of the branch to select
   *
   * @example
   * ```typescript
   * service.setSelectedBranch(1);
   *
   * // Components can subscribe to changes
   * service.selectedBranch$.subscribe(branchId => {
   *   if (branchId) {
   *     console.log('Selected branch:', branchId);
   *   }
   * });
   * ```
   */
  setSelectedBranch(branchId: number | null): void {
    this.selectedBranchSubject.next(branchId);
  }

  /** Sets the currently selected configuration (used to pass context between routes) */
  setSelectedConfiguration(config: AppointmentConfiguration | null): void {
    this.selectedConfigurationSubject.next(config);
  }

  /**
   * Gets the currently selected branch ID.
   *
   * @returns The current branch ID or null if none selected
   */
  getSelectedBranch(): number | null {
    return this.selectedBranchSubject.value;
  }

  /** Gets the current selected configuration synchronously */
  getSelectedConfiguration(): AppointmentConfiguration | null {
    return this.selectedConfigurationSubject.value;
  }

  /**
   * Sets the loading state for the service.
   *
   * @param loading - Whether the service is currently loading
   * @private
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Handles HTTP errors and transforms them into a consistent format.
   *
   * @param error - The HTTP error response
   * @returns Observable that throws an ErrorApi
   * @private
   */
  private handleError(error: unknown): Observable<never> {
    // eslint-disable-next-line no-console
    console.error('AppointmentConfigurationService error:', error);

    // Type guard to ensure we have an HttpErrorResponse
    const httpError = error as HttpErrorResponse;

    // Transform HTTP error to our standard format
    const backendMessage =
      httpError?.error?.message ||
      httpError?.error?.error || // algunos backends usan 'error' como texto
      httpError?.message ||
      'Ocurrió un error de ejecución. Contactá al soporte si el problema persiste.';

    const apiError: ErrorApi = {
      status: httpError?.status || 500,
      message: backendMessage,
      detail: httpError?.error?.detail,
      timestamp: httpError?.error?.timestamp || new Date().toISOString(),
      path: httpError?.url || '',
      errors: httpError?.error?.errors
    };

    return throwError(() => apiError);
  }
}
