import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { ResultsPayload, WorksheetFormData } from '../../models/worksheet/worksheet-form.interface';
import { WorksheetService } from '../../services/worksheets/worksheet.service';
import { WorksheetFillHeaderComponent } from '../worksheet-fill-header/worksheet-fill-header.component';
import { WorksheetResultsTableComponent } from '../worksheet-results-table/worksheet-results-table.component';



/**
 * Main component for filling worksheet results
 * Manages the entire form state and orchestrates child components
 */
@Component({
  selector: 'app-worksheet-fill',
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    GenericAlertComponent,
    WorksheetFillHeaderComponent,
    WorksheetResultsTableComponent
  ],
  templateUrl: './worksheet-fill.component.html',
  styleUrl: './worksheet-fill.component.css'
})
export class WorksheetFillComponent implements OnInit {
  private worksheetService = inject(WorksheetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);

  // Signals for state management
  worksheetData = signal<WorksheetFormData | null>(null);
  loading = signal(false);
  saving = signal(false);

  // Alert state
  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning'>('success');
  alertTitle = signal('');
  alertText = signal('');

  // Form state: simple flat structure with composite keys
  // Key format: "sampleId_analysisId_determinationId"
  formValues: Record<string, string> = {};

  /**
   * Initializes the component by extracting the template ID from the route
   * and loading the worksheet form data
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Completar planilla');
    this.breadcrumbService.buildFromRoute(this.route);
    const templateIdParam = this.route.snapshot.params['id'];
    const templateId = Number(templateIdParam);

    // Validar templateId para evitar NaN en la URL
    if (!Number.isFinite(templateId) || templateId <= 0) {
      this.showAlertMessage('error', 'ID inválido', 'El ID de la plantilla es inválido.');
      // Opcional: navegar atrás o al listado
      this.router.navigate(['/analytical-management/worksheets']);
      return;
    }

    // Forzar sectionId = 5 según requisito
    const sectionId = 5;
    this.loadWorksheetForm(templateId, sectionId);
  }

  /**
   * Load worksheet form data from backend
   * @param templateId - The worksheet template ID
   * @param sectionId - The laboratory area/section ID
   */
  private loadWorksheetForm(templateId: number, sectionId: number): void {
    this.loading.set(true);

    this.worksheetService.getWorksheetForm(templateId, sectionId).subscribe({
      next: (data) => {
        // Normalizar la respuesta del backend a camelCase para uso interno
        const normalized = this.normalizeWorksheetData(data as any);
        this.worksheetData.set(normalized);
        this.initializeFormValues(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.showAlertMessage('error', 'Error', 'No se ha podido cargar el formulario.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Normalize backend response (snake_case) into frontend-friendly camelCase shape
   */
  private normalizeWorksheetData(raw: any): WorksheetFormData {
    if (!raw) {
      return {
        worksheetId: null,
        worksheetName: '',
        sectionId: 0,
        analyses: []
      };
    }

    const analyses = (raw.analyses || []).map((a: any) => {
      const determinations = (a.determinations || []).map((d: any) => ({
        determinationId: d.determinationId,
        determinationName: d.determinationName,
        unit: d.unit,
        normalRange: d.normalRange
      }));

      const patientsRaw = a.patientColumns ?? a.patients ?? [];
      const patients = (patientsRaw || []).map((p: any) => ({
        sampleId: p.sampleId,
        patientId: p.patientId,
        protocolId: p.protocolId,
        patientName: p.patientName ?? '',
        protocolNumber: p.protocolNumber ?? '',
        collectionDate: p.collectionDate ?? null,
        sampleType: p.sampleType
      }));

      return {
        analysisId: a.analysisId,
        analysisName: a.analysisName,
        sectionCode: a.sectionCode,
        sectionName: a.sectionName,
        determinations,
        patients
      } as any;
    });

    return {
      worksheetId: raw.worksheetId,
      worksheetName: raw.worksheetName ?? '',
      sectionId: raw.sectionId ?? 0,
      analyses
    };
  }

  /**
   * Initialize form values structure based on API response (normalized)
   */
  private initializeFormValues(data: WorksheetFormData): void {
    // Initialize all possible keys with empty strings
    (data.analyses || []).forEach(analysis => {
      (analysis.patients || []).forEach(patient => {
        (analysis.determinations || []).forEach(determination => {
          const key = this.makeKey(patient.sampleId, analysis.analysisId, determination.determinationId);
          this.formValues[key] = '';
        });
      });
    });
  }

  /**
   * Create composite key for form values
   */
  private makeKey(sampleId: number, analysisId: number, determinationId: number): string {
    return `${sampleId}_${analysisId}_${determinationId}`;
  }

  /**
   * Handle value change from child component
   */
  onValueChange(event: { sampleId: number; analysisId: number; determinationId: number; value: string }): void {
    const key = this.makeKey(event.sampleId, event.analysisId, event.determinationId);
    this.formValues[key] = event.value;
  }

  /**
   * Get total count of patients across all analyses
   */
  getTotalPatientsCount(): number {
    const data = this.worksheetData();
    if (!data) return 0;

    // Usar Set para evitar contar pacientes duplicados si aparecen en múltiples análisis
    const uniqueSampleIds = new Set<number>();
    data.analyses.forEach(analysis => {
      analysis.patients.forEach(patient => {
        uniqueSampleIds.add(patient.sampleId);
      });
    });

    return uniqueSampleIds.size;
  }

  /**
   * Build payload for submission according to API specification
   * POST /api/v1/results expects:
   * {
   *   entries: [{
   *     patientId: number,
   *     protocolId: number,
   *     sampleId: number,
   *     analysisId: number,
   *     sectionId: number,
   *     results: [{ determinationId: number, value: string }]
   *   }]
   * }
   */
  private buildPayload(): ResultsPayload {
    const data = this.worksheetData();
    if (!data) return { entries: [] };

    const entries: ResultsPayload['entries'] = [];

    // Iterate through analyses and their patient_columns to build entries
    data.analyses.forEach(analysis => {
      analysis.patients.forEach(patient => {
        const results: ResultsPayload['entries'][0]['results'] = [];

        analysis.determinations.forEach(determination => {
          const key = this.makeKey(patient.sampleId, analysis.analysisId, determination.determinationId);
          let value = this.formValues[key];

          // Only include non-empty values
          if (value && String(value).trim() !== '') {
            // Sanitize: trim and normalize decimal comma to dot
            let normalized = String(value).trim().replace(/,/g, '.');
            // Filter out literal 'NaN' (case-insensitive)
            if (normalized.toLowerCase() === 'nan') {
              return; // skip this determination
            }
            // After normalization, ensure it's still non-empty
            if (normalized !== '') {
              results.push({
                determinationId: determination.determinationId,
                value: normalized
              });
            }
          }
        });

        // Only add entry if it has results
        if (results.length > 0) {
          entries.push({
            patientId: patient.patientId,      // Each patient has its own ID
            protocolId: patient.protocolId,   // Each patient has its own protocol ID
            sampleId: patient.sampleId,
            analysisId: analysis.analysisId,
            sectionId: data.sectionId ?? 0,
            results
          });
        }
      });
    });

    return { entries };
  }

  /**
   * Check if form has any data
   */
  private hasData(): boolean {
    return Object.values(this.formValues).some(value => value && value.trim() !== '');
  }

  /**
   * Save results
   */
  onSave(): void {
    if (!this.hasData()) {
      this.showAlertMessage('warning', 'Sin datos', 'Debe completar al menos un resultado.');
      return;
    }

    const payload = this.buildPayload();

    if (payload.entries.length === 0) {
      this.showAlertMessage('warning', 'Sin datos', 'No se encontraron resultados para enviar.');
      return;
    }

    this.saving.set(true);

    this.worksheetService.saveResults(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAlertMessage('success', 'Guardado', 'Resultados guardados correctamente.');
        // Redirigir a post-analytical home después de guardar exitosamente
        setTimeout(() => {
          this.router.navigate(['/analytical-management/post-analytical']);
        }, 1500);
      },
      error: () => {
        this.saving.set(false);
        this.showAlertMessage('error', 'Error', 'No se ha podido guardar los resultados.');
      }
    });
  }

  /**
   * Cancela la edición del worksheet y navega al listado.
   * Método usado por el template a través de (cancelWorksheet)="onCancel()"
   */
  onCancel(): void {
    // Simplemente navegar atrás al listado de worksheets
    this.router.navigate(['/analytical-management/worksheets']);
  }

  /**
   * Muestra un alert interno y lo autooculta tras unos segundos
   */
  private showAlertMessage(type: 'success' | 'error' | 'warning', title: string, text: string): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    // Auto-hide after 4.5s
    setTimeout(() => this.showAlert.set(false), 4500);
  }
}
