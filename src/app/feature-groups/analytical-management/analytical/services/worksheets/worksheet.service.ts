import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { map } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { ResultsPayload, WorksheetFormData } from '../../models/worksheet/worksheet-form.interface';
import { WorkSheetTemplateViewDTO } from '../../models/worksheet/worksheet.interface';


/**
 * Service responsible for managing worksheet-related operations.
 * Provides methods for retrieving worksheet templates and generating PDF reports,
 * and saving analysis results.
 */
@Injectable({
  providedIn: 'root'
})
export class WorksheetService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;
  readonly DEFAULT_SECTION_ID = '5';

  /**
   * Retrieves all available worksheet templates.
   * @returns {Observable<WorkSheetTemplateViewDTO[]>} An observable that emits an array of worksheet templates.
   * @throws Will throw an error if the API request fails.
   * @example
   * // Get all worksheet templates
   * worksheetService.getAll().subscribe(templates => {
   *   console.log('Available templates:', templates);
   * });
   */
  getAll(): Observable<WorkSheetTemplateViewDTO[]> {
    return this.http.get<WorkSheetTemplateViewDTO[]>(
      `${this.apiUrl}/worksheets/templates`
    );
  }

  /**
   * Retrieves an available worksheet template by id.
   */
  getById(templateId: number): Observable<WorkSheetTemplateViewDTO> {
    return this.http.get<WorkSheetTemplateViewDTO>(
      `${this.apiUrl}/worksheets/templates/${templateId}`
    );
  }

  /**
   * Downloads a worksheet template as a PDF file.
   * @param {number} templateId - The unique identifier of the worksheet template.
   * @returns {Observable<{blob: Blob, filename?: string}>} An observable that emits the PDF file as a Blob and optional filename.
   * @throws Will throw an error if the template is not found or if there's a server error.
   * @example
   * // Download worksheet template as PDF
   * worksheetService.downloadPdf(1).subscribe(({blob, filename}) => {
   *   const url = window.URL.createObjectURL(blob);
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = filename || 'worksheet-template.pdf';
   *   a.click();
   *   window.URL.revokeObjectURL(url);
   * });
   */
  downloadPdf(templateId: number): Observable<{ blob: Blob; filename?: string }> {
    return this.http.get(
      `${this.apiUrl}/worksheets/pdf/${templateId}?sectionId=${this.DEFAULT_SECTION_ID}`,
      { responseType: 'blob', observe: 'response' as const }
    ).pipe(
      map((response: HttpResponse<Blob>) => {
        const contentDisposition = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
        let filename: string | undefined;
        if (contentDisposition) {
          const match = /filename\*=UTF-8''([^;\n\r]*)/.exec(contentDisposition) || /filename="?([^";]*)"?/.exec(contentDisposition);
          if (match && match[1]) {
            try {
              filename = decodeURIComponent(match[1]);
            } catch {
              filename = match[1];
            }
          }
        }
        return { blob: response.body as Blob, filename };
      })
    );
  }

  /**
   * Retrieves the worksheet form data for filling results.
   * Returns the worksheet structure with analyses, determinations, and samples.
   * @param {number} templateId - The unique identifier of the worksheet template.
   * @param {number} sectionId - The area id used to filter the form
   * @returns {Observable<WorksheetFormData>} An observable that emits the worksheet form structure.
   * @throws Will throw an error if the worksheet is not found or if there's a server error.
   * @example
   * // Get worksheet form for filling results
   * worksheetService.getWorksheetForm(6, 2).subscribe(formData => {
   *   console.log('Worksheet:', formData.worksheetName);
   *   console.log('Samples:', formData.samples.length);
   *   console.log('Analyses:', formData.analyses.length);
   * });
   */
  getWorksheetForm(templateId: number, sectionId: number): Observable<WorksheetFormData> {
    const tid = Number(templateId);
    let aid = Number(sectionId);
    // Force sectionId = 5 if it's invalid
    if (!Number.isFinite(aid) || aid <= 0) aid = 5;
    if (!Number.isFinite(tid) || tid <= 0) {
      // Evitar llamar al backend con NaN en la ruta
      return throwError(() => new Error('Invalid templateId'));
    }

    return this.http.get<WorksheetFormData>(
      `${this.apiUrl}/worksheets/forms/${tid}`,
      { params: { sectionId: aid.toString() } }
    );
  }

  /**
   * Saves analysis results for multiple samples and analyses.
   * @param {ResultsPayload} payload - The results payload containing all entries to save.
   * @returns {Observable<any>} An observable that emits the server response.
   * @throws Will throw an error if the save operation fails or if there's a validation error.
   * @example
   * // Save results for multiple samples
   * const payload = {
   *   entries: [
   *     {
   *       sampleId: 32,
   *       analysisId: 172,
   *       results: [
   *         { determinationId: 2, value: "4.6" },
   *         { determinationId: 3, value: "42" }
   *       ]
   *     }
   *   ]
   * };
   *
   * worksheetService.saveResults(payload).subscribe({
   *   next: () => console.log('Results saved successfully'),
   *   error: (err) => console.error('Error saving results:', err)
   * });
   */
  saveResults(payload: ResultsPayload): Observable<any> {
    // Sanitize and normalize values (interceptor handles case conversion)
    const sanitized = {
      entries: (payload.entries || []).map((entry: any) => {
        const results = (entry.results || []).map((r: any) => {
          let value = (r.value ?? '').toString().trim();
          // normalize decimal comma to dot
          value = value.replace(/,/g, '.');
          // filter out invalid values
          if (value === '' || value.toLowerCase() === 'nan') return null;
          return { determinationId: r.determinationId, value };
        }).filter((x: any) => x !== null);

        return {
          sampleId: entry.sampleId,
          analysisId: entry.analysisId,
          patientId: entry.patientId,
          sectionId: entry.sectionId,
          protocolId: entry.protocolId,
          results
        };
      }).filter((e: any) => (e.results && e.results.length > 0))
    };

    return this.http.post(
      `${this.apiUrl}/results`,
      sanitized
    );
  }

  /**
   * Creates a new worksheet template.
   * @param {CreateWorksheetTemplateDTO} template - The template data to create.
   * @returns {Observable<WorkSheetTemplateViewDTO>} An observable that emits the created template.
   * @throws Will throw an error if the creation fails or if there's a validation error.
   * @example
   * // Create a new worksheet template
   * const newTemplate = {
   *   name: 'ELISA Básico',
   *   analyses: [
   *     { analysisId: 7, displayOrder: 1 }
   *   ]
   * };
   * worksheetService.create(newTemplate).subscribe({
   *   next: (template) => console.log('Template created:', template),
   *   error: (err) => console.error('Error creating template:', err)
   * });
   */
  create(template: CreateWorksheetTemplateDTO): Observable<WorkSheetTemplateViewDTO> {
    return this.http.post<WorkSheetTemplateViewDTO>(
      `${this.apiUrl}/worksheets/templates`,
      template
    );
  }

  /**
   * Updates an existing worksheet template.
   * @param {number} templateId - The unique identifier of the template to update.
   * @param {CreateWorksheetTemplateDTO} template - The updated template data.
   * @returns {Observable<WorkSheetTemplateViewDTO>} An observable that emits the updated template.
   * @throws Will throw an error if the update fails or if the template is not found.
   */
  update(templateId: number, template: CreateWorksheetTemplateDTO): Observable<WorkSheetTemplateViewDTO> {
    return this.http.put<WorkSheetTemplateViewDTO>(
      `${this.apiUrl}/worksheets/templates/${templateId}`,
      template
    );
  }

  /**
   * Deletes a worksheet template.
   * @param {number} templateId - The unique identifier of the template to delete.
   * @returns {Observable<void>} An observable that completes when the template is deleted.
   * @throws Will throw an error if the deletion fails or if the template is not found.
   */
  delete(templateId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/worksheets/templates/${templateId}`
    );
  }

}

/**
 * DTO for creating or updating a worksheet template.
 * Based on POST /api/v1/worksheets/templates endpoint
 */
export interface CreateWorksheetTemplateDTO {
  /**
   * The name of the worksheet template
   * @example 'Plantilla Hematología'
   */
  name: string;

  /**
   * Array of analyses with their IDs and display order
   * @example [{ analysisId: 1, displayOrder: 1 }, { analysisId: 3, displayOrder: 2 }]
   */
  analyses: {
    analysisId: number;
    displayOrder: number;
  }[];
}
