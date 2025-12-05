import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import { WorksheetFormData } from '../../models/worksheet/worksheet-form.interface';
import { WorksheetService } from '../../services/worksheets/worksheet.service';
import { WorksheetResultsTableComponent } from '../worksheet-results-table/worksheet-results-table.component';

/**
 * Componente que carga la planilla de resultados desde el backend y expone
 * la UI para ingresar y guardar los resultados por análisis y muestra.
 */
@Component({
  selector: 'app-worksheet-results-loader',
  standalone: true,
  imports: [CommonModule, FormsModule, WorksheetResultsTableComponent],
  templateUrl: './worksheet-results-loader.component.html'
})
export class WorksheetResultsLoaderComponent {
  @Input({ required: true }) templateId!: number;

  loading = false;
  error: string | null = null;

  worksheetData: WorksheetFormData | null = null;

  // flat map of values keyed by `${sampleId}_${analysisId}_${determinationId}`
  formValues: Record<string, string> = {};

  private sub: Subscription | null = null;

  /**
   * Inyecta el servicio que consulta la API de worksheets
   */
  constructor(private worksheetService: WorksheetService) {}

  /**
   * Carga la planilla (GET /worksheets/forms/{templateId}?sectionId=5)
   */
  load(): void {
    this.loading = true;
    this.error = null;
    this.worksheetData = null;
    this.formValues = {};

    // El servicio ya fuerza sectionId = 5 internamente; se pasa por claridad
    this.sub = this.worksheetService.getWorksheetForm(this.templateId, 5).subscribe({
      next: (data) => {
        this.worksheetData = data;
        // Inicializar formValues
        data.analyses.forEach((analysis) => {
          analysis.patients.forEach((p) => {
            analysis.determinations.forEach((d) => {
              const key = `${p.sampleId}_${analysis.analysisId}_${d.determinationId}`;
              this.formValues[key] = '';
            });
          });
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Error cargando la planilla';
        this.loading = false;
      }
    });
  }

  /**
   * Actualiza el valor de una celda cuando el componente hijo emite el cambio
   */
  onCellChanged(event: { sampleId: number; analysisId: number; determinationId: number; value: string; }) {
    const key = `${event.sampleId}_${event.analysisId}_${event.determinationId}`;
    this.formValues[key] = event.value;
  }

  /**
   * Prepara el payload a enviar al backend y lo muestra en consola (simulado)
   */
  saveAll(): void {
    if (!this.worksheetData) return;

    this.worksheetData.analyses.map((analysis) => {
      const results: { sampleId: number; determinationId: number; value: string }[] = [];
      analysis.patients.forEach((p) => {
        analysis.determinations.forEach((d) => {
          const key = `${p.sampleId}_${analysis.analysisId}_${d.determinationId}`;
          let value = this.formValues[key];
          if (value === undefined) return;
          // Normalizar y sanitizar: trim, coma->punto
          value = String(value).trim().replace(/,/g, '.');
          // Filtrar literales invalidas como 'NaN' (case-insensitive) o vacío
          if (value === '' || value.toLowerCase() === 'nan') return;
          results.push({ sampleId: p.sampleId, determinationId: d.determinationId, value });
        });
      });
      return {
        analysisId: analysis.analysisId,
        results
      };
    }).filter(p => (p.results && p.results.length > 0));

    // eslint-disable-next-line no-console -- Debug log for payload inspection
    alert('Payload preparado en consola (ver DevTools)');
  }

  /**
   * Cancela la operación y limpia el estado local
   */
  cancel(): void {
    this.worksheetData = null;
    this.formValues = {};
    this.error = null;
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
  }
}
