import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, inject, OnInit, Output, signal, TemplateRef, ViewChild } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { GenericColumn } from 'src/app/shared/models/generic-table.models';
import { ExcelExportService } from 'src/app/shared/services/export/excel-export.service';
import { PdfExportService } from 'src/app/shared/services/export/pdf-export.service';

import { extractErrorMessage } from '../../../../../../shared/utils/error-message.util';
import { DeterminationService } from '../../../application/determination.service';
import { Determination } from '../../../domain/determination.model';
import { DeterminationEditFormComponent } from '../determination-edit-form/determination-edit-form.component';

import { DETERMINATION_EXPORT_COLUMNS, DETERMINATION_PDF_COLUMNS } from './determinations-export-config';

/**
 *
 */
type AlertType = 'success' | 'error' | 'warning' | 'info';

const FLASH_DURATION = 4500;

/**
 * Página de gestión de Determinaciones
 * Muestra un catálogo de todas las determinaciones disponibles en el sistema
 * Carga las determinaciones directamente desde GET /api/v1/determinations
 */
@Component({
  selector: 'app-determinations-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DividerModule,
    TagModule,
    GenericAlertComponent,
    GenericModalComponent,
    GenericTableComponent,
    DeterminationEditFormComponent
  ],
  templateUrl: './determinations-home.component.html',
  styleUrl: './determinations-home.component.css'
})
export class DeterminationsHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly determinationService = inject(DeterminationService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);

  @ViewChild('handlingTimeTpl', { static: true }) handlingTimeTpl!: TemplateRef<any>;
  @ViewChild('measurementUnitTpl', { static: true }) measurementUnitTpl!: TemplateRef<any>;

  determinations = signal<Determination[]>([]);
  selectedDetermination = signal<Determination | null>(null);
  loading = signal<boolean>(false);

  showEditDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);

  showAlert = signal<boolean>(false);
  alertType = signal<AlertType>('info');
  alertTitle = signal<string>('');
  alertText = signal<string>('');

  /** Emite solicitud de refresco al padre tras guardar */
  @Output() refreshRequested = new EventEmitter<void>();

  columns: GenericColumn[] = [];
  getRowActions = (row: Determination) => this.buildRowActions(row);

  /**
   * Initializes the component and sets up table configuration
   */
  ngOnInit(): void {
    this.buildColumns();
    this.loadDeterminations();
  }

  /**
   * Builds the table column configuration
   */
  private buildColumns(): void {
    this.columns = [
      { field: 'name', header: 'Nombre de la Determinación', sortable: true },
      { field: 'analyticalPhaseSetting.analyticalMethod.measurementUnit.name', header: 'Unidad de Medida', template: this.measurementUnitTpl, sortable: true },
      { field: 'handlingTime', header: 'Tiempo de Manejo', template: this.handlingTimeTpl },
      { field: 'percentageVariationTolerated', header: 'Variación Tolerada (%)', sortable: true }
    ];
  }

  /**
   * Builds row actions for each determination
   */
  private buildRowActions(row: Determination): any[] {
    return [
      { label: 'Ver Detalles', icon: 'pi pi-eye', command: () => this.onViewDetails(row) },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.onEdit(row) }
    ];
  }

  /**
   * Loads all determinations from the service
   */
  private loadDeterminations(): void {
    this.loading.set(true);
    this.determinationService.getDeterminations().subscribe({
      next: (determinations) => {
        this.determinations.set(determinations);
        this.loading.set(false);
      },
      error: (error) => {
        // console.error('Error loading determinations:', error);
        this.displayAlert('error', 'Error', extractErrorMessage(error, 'al cargar las determinaciones'));
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles the edit action
   */
  onEdit(determination: Determination): void {
    this.selectedDetermination.set(determination);
    this.showEditDialog.set(true);
  }

  /**
   * Handles the view details action
   */
  onViewDetails(determination: Determination): void {
    this.selectedDetermination.set(determination);
    this.showDetailsDialog.set(true);
  }

  /**
   * Opens the edit dialog for creating a new determination
   */
  onAddNew(): void {
    this.selectedDetermination.set(null);
    this.showEditDialog.set(true);
  }

  /**
   * Handles successful determination save event
   */
  onDeterminationSaved(_updatedDetermination: Determination): void {
    this.showEditDialog.set(false);
    this.displayAlert('success', 'Éxito', 'Determinación guardada correctamente.');
    // Recargar determinaciones para actualizar la tabla
    this.loadDeterminations();
    this.refreshRequested.emit();
  }

  /**
   * Closes all open dialogs and resets selections
   */
  closeDialogs(): void {
    this.showEditDialog.set(false);
    this.showDetailsDialog.set(false);
    this.selectedDetermination.set(null);
  }

  /**
   * Displays an alert message to the user
   */
  private displayAlert(type: AlertType, title: string, text: string): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    const timeoutId = setTimeout(() => this.showAlert.set(false), FLASH_DURATION);
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  /**
   * Formats handling time for display
   */
  formatHandlingTime(handlingTime: any): string {
    if (!handlingTime) return 'No especificado';
    if (!handlingTime.timeValue) return 'No especificado';

    const timeUnit = handlingTime.timeUnit || 'SECONDS';
    const value = handlingTime.timeValue;

    switch (timeUnit) {
    case 'SECONDS':
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      if (minutes > 0) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
      }
      return `${seconds}s`;
    case 'MINUTES':
      return `${value} min`;
    case 'HOURS':
      return `${value} h`;
    case 'DAYS':
      return `${value} días`;
    default:
      return `${value} ${timeUnit.toLowerCase()}`;
    }
  }

  /**
   * Gets the measurement unit name from analytical phase setting
   */
  getMeasurementUnit(determination: Determination): string {
    return determination.analyticalPhaseSetting?.analyticalMethod?.measurementUnit?.name
      || determination.analyticalPhaseSetting?.analyticalMethod?.measurementUnit?.symbol
      || 'N/A';
  }

  /**
   * Determines the severity level based on variation percentage
   */
  getVariationSeverity(percentage?: number): string {
    if (!percentage) return 'secondary';
    if (percentage <= 5) return 'success';
    if (percentage <= 10) return 'warning';
    return 'danger';
  }

  /**
   * Handles export action from the table
   */
  async onDeterminationExport(filteredData: Determination[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    const dataToExport = filteredData;

    if (dataToExport.length === 0) {
      this.displayAlert('warning', 'Sin datos', 'No hay datos para exportar.');
      return;
    }

    try {
      const fileName = `determinaciones_${this.getFormattedDateForExport()}`;

      if (event.type === 'excel') {
        await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: DETERMINATION_EXPORT_COLUMNS,
          fileName: fileName,
          sheetName: 'Determinaciones',
          includeTimestamp: true
        });
        this.displayAlert('success', 'Éxito', 'Excel generado correctamente.');
      } else {
        await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: DETERMINATION_PDF_COLUMNS,
          fileName: fileName,
          title: 'Determinaciones',
          includeTimestamp: true
        });
        this.displayAlert('success', 'Éxito', 'PDF generado correctamente.');
      }
    } catch {
      // eslint-disable-next-line no-console -- Error log for export failure
      // console.error('Error during export:', _error);
      this.displayAlert('error', 'Error', `No se pudo generar el archivo ${event.type.toUpperCase()}.`);
    }
  }

  /**
   * Gets the current date formatted as dd-MM-yyyy for export file names
   * @returns Formatted date string
   */
  private getFormattedDateForExport(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
