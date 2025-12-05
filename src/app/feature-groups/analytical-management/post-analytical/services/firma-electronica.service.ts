import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { catchError } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BulkSignatureResponseDto, SignatureRequestDto } from '../models/models';


/**
 * Service for electronic signature operations
 */
@Injectable({
  providedIn: 'root'
})
export class FirmaElectronicaService {

  private readonly apiUrl = `${environment.apiUrl}/v1/signatures`;

  /**
   * Constructor
   * @param http - HTTP client
   */
  constructor(private http: HttpClient) {}

  /**
   * Intelligently sign a study (auto-detects total or partial signature)
   * If all results are validated: performs total signature and closes study
   * If some results are validated: performs partial signatures on those
   *
   * @param studyId - Study ID to sign
   * @param request - Optional signature request with comments
   * @returns Observable of bulk signature response
   */
  signStudyIntelligently(
    studyId: number,
    request?: SignatureRequestDto
  ): Observable<BulkSignatureResponseDto> {
    const url = `${this.apiUrl}/studies/${studyId}`;

    return this.http.post<BulkSignatureResponseDto>(url, request || {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get user-friendly message based on signature result
   * @param response - Bulk signature response
   * @returns User-friendly message
   */
  getSignatureMessage(response: BulkSignatureResponseDto): string {
    if (response.totalSignaturePerformed) {
      return `Firma total exitosa. Estudio cerrado con ${response.signedCount} análisis firmados.`;
    } else {
      return `Firma parcial exitosa. Se firmaron ${response.signedCount} de ${response.totalResults} análisis. Progreso: ${response.signedCount + response.previouslySignedResults}/${response.totalResults}`;
    }
  }

  /**
   * Check if all results are validated (ready for total signature)
   * @param results - Array of results
   * @returns True if all results are validated (or already signed)
   */
  canSignTotal(results: any[]): boolean {
    if (results.length === 0) {
      return false;
    }

    // Para firma total, TODOS los análisis deben estar validados o ya firmados
    const allValidatedOrSigned = results.every(result =>
      this.areAllDeterminationsValidated(result) || result.currentStatus === 'SIGNED'
    );

    // Pero debe haber al menos UN análisis pendiente de firma (validado pero no firmado)
    const hasPendingToSign = results.some(result => this.canBeSignedNow(result));

    return allValidatedOrSigned && hasPendingToSign;
  }

  /**
   * Check if only some results are validated (ready for partial signature)
   * @param results - Array of results
   * @returns True if some (but not all) results are validated and not signed
   */
  canSignPartial(results: any[]): boolean {
    // Contar análisis que pueden ser firmados ahora (validados y no firmados)
    const canBeSignedCount = results.filter(result => this.canBeSignedNow(result)).length;

    // Contar análisis totales que no están firmados
    const notSignedCount = results.filter(result => result.currentStatus !== 'SIGNED').length;

    // Firma parcial si:
    // 1. Hay al menos un análisis que puede ser firmado
    // 2. Hay análisis sin firmar que aún no pueden firmarse (no todas sus determinaciones validadas)
    return canBeSignedCount > 0 && canBeSignedCount < notSignedCount;
  }

  /**
   * Check if a result can be signed now
   * Un análisis puede ser firmado si:
   * - Todas sus determinaciones están validadas
   * - Y NO está ya firmado
   * @param result - Result to check
   * @returns True if the result can be signed now
   */
  private canBeSignedNow(result: any): boolean {
    return this.areAllDeterminationsValidated(result) && result.currentStatus !== 'SIGNED';
  }

  /**
   * Check if all determinations in a result are validated
   * Un análisis se puede firmar cuando TODAS sus determinaciones están validadas
   * @param result - Result to check
   * @returns True if all determinations are validated
   */
  private areAllDeterminationsValidated(result: any): boolean {
    if (!result.determinations || result.determinations.length === 0) {
      return false;
    }

    // Filtrar solo las determinaciones con displayValue válido (no vacío ni null) y que tengan id
    const validDeterminations = result.determinations.filter((det: any) => 
      det.id && det.displayValue && det.displayValue !== ''
    );

    // Si no hay determinaciones válidas, no se puede validar
    if (validDeterminations.length === 0) {
      return false;
    }

    // Verificar que TODAS las determinaciones válidas tengan manualValidationStatus = 'VALIDATED'
    // El backend usa 'VALIDATED' no 'VALID'
    return validDeterminations.every((det: any) =>
      det.manualValidationStatus === 'VALIDATED'
    );
  }

  /**
   * Handle HTTP errors
   * @param error - HTTP error response
   * @returns Observable that throws a user-friendly error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error al realizar la firma electrónica.';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
      case 400:
        errorMessage = error.error?.message || 'No hay resultados validados para firmar.';
        break;
      case 404:
        errorMessage = 'Estudio no encontrado.';
        break;
      case 409:
        errorMessage = error.error?.message || 'Conflicto al firmar el estudio.';
        break;
      case 500:
        errorMessage = 'Error interno del servidor. Por favor, intente nuevamente.';
        break;
      default:
        errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
