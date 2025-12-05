import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

/**
 * Service for managing appointment-related operations from patient context.
 * Handles fetching appointment details and downloading prescription files.
 */
@Injectable({
  providedIn: 'root'
})
export class AppointmentPatientService {
  private baseUrl  = environment.apiUrl + '/v1/public-appointments';

  /**
   * Constructor for AppointmentPatientService.
   * @param Http HttpClient for making HTTP requests
   */
  constructor(private Http: HttpClient) { }

  /**
   * Downloads the prescription file directly from the backend.
   * The endpoint returns the file as a binary blob (PDF/image) ready for download or preview.
   *
   * Note: The backend returns incorrect Content-Type (always application/pdf),
   * so we extract the real file extension from the Content-Disposition filename header.
   *
   * @param id Appointment ID to fetch prescription from
   * @returns Observable with an object containing the blob and the correct filename
   *
   * @example
   * ```typescript
   * this.appointmentService.downloadPrescriptionFile(123).subscribe({
   *   next: ({blob, filename}) => {
   *     const url = window.URL.createObjectURL(blob);
   *     window.open(url, '_blank');
   *   }
   * });
   * ```
   */
  downloadPrescriptionFile(id: number): Observable<{ blob: Blob; filename: string }> {
    const url = `${this.baseUrl}/${id}/prescription-url`;

    return this.Http.get(url, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        if (!response.body) {
          throw new Error('No body in response');
        }

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition') || '';
        let filename = `prescription_${id}.pdf`; // default fallback

        // Parse: content-disposition: form-data; name="attachment"; filename="file.png"
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }

        // Extract extension from filename to determine correct MIME type
        const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();

        // Create a new Blob with the CORRECT mime type based on extension
        let correctMimeType = response.body.type; // fallback to original

        switch (extension) {
        case '.png':
          correctMimeType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          correctMimeType = 'image/jpeg';
          break;
        case '.gif':
          correctMimeType = 'image/gif';
          break;
        case '.pdf':
          correctMimeType = 'application/pdf';
          break;
        case '.bmp':
          correctMimeType = 'image/bmp';
          break;
        case '.tiff':
        case '.tif':
          correctMimeType = 'image/tiff';
          break;
        }

        // Create a new blob with the correct MIME type
        const correctedBlob = new Blob([response.body], { type: correctMimeType });

        return { blob: correctedBlob, filename };
      })
    );
  }
}

