import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { PrimeModalService } from '../../../../../shared/components/modal/prime-modal.service';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../../shared/models/filter.model';
import { ExcelExportService } from '../../../../../shared/services/export/excel-export.service';
import { PdfExportService } from '../../../../../shared/services/export/pdf-export.service';
import { WorkSheetTemplateViewDTO } from '../../models/worksheet/worksheet.interface';
import { AreaService } from '../../services/area.service';
import { WorksheetService } from '../../services/worksheets/worksheet.service';
import { TemplateManagementComponent } from '../template-management/template-management.component';

import { WORKSHEET_EXPORT_COLUMNS, WORKSHEET_PDF_COLUMNS } from './worksheet-export-config';

/**
 * Component for displaying and managing worksheet templates.
 *
 * This component provides a comprehensive interface for:
 * - Displaying a list of worksheet templates in a paginated, sortable table
 * - Filtering templates by section/area
 * - Performing actions such as editing, downloading PDFs, and filling worksheets
 * - Handling empty states and loading states with appropriate UI feedback
 *
 * @example
 * ```html
 * <app-worksheet-list></app-worksheet-list>
 * ```
 */
@Component({
  selector: 'app-worksheet-list',
  imports: [
    GenericButtonComponent,
    SpinnerComponent,
    GenericTableComponent,
    GenericAlertComponent,
    GenericModalComponent,
    TemplateManagementComponent
  ],
  templateUrl: './worksheet-list.component.html',
  styleUrl: './worksheet-list.component.css'
})
export class WorksheetListComponent implements OnInit {
  /** Signal for all worksheet templates */
  templates = signal<WorkSheetTemplateViewDTO[]>([]);

  /** Loading state indicator */
  loading = signal(false);

  /** Alert display state and configuration */
  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning'>('success');
  alertTitle = signal('');
  alertMessage = signal('');

  /** Template creation modal visibility */
  showTemplateModal = signal(false);

  /** Template ID for editing in modal */
  editingTemplateId = signal<number | undefined>(undefined);

  /** Detail modal visibility */
  showDetailModal = signal(false);

  /** Worksheet detail to display in modal */
  worksheetDetail = signal<WorkSheetTemplateViewDTO | null>(null);

  /** Section filter */
  activeSectionFilter = signal<number | null>(null);

  /** Computed signal for filtered templates (by section) */
  filteredTemplates = computed(() => {
    const sectionFilter = this.activeSectionFilter();
    const allTemplates = this.templates();

    // If no section filter selected, show all templates
    if (sectionFilter === null) {
      return allTemplates;
    }

    // Filter templates by sectionId
    return allTemplates.filter(template => {
      const templateSectionId = template.sectionId;
      return templateSectionId === sectionFilter;
    });
  });

  /** Table column configuration */
  columns = [
    { field: 'name', header: 'Nombre', sortable: true }
  ];

  /** Filter configuration for sections/areas */
  filters: Filter[] = [
    {
      id: 'section',
      label: 'Sección',
      type: 'select',
      options: [
        { label: 'Todas', value: null, active: true }
      ]
    }
  ];

  /** Function to generate actions for each table row */
  getActions = (template: WorkSheetTemplateViewDTO) => [
    {
      id: 'view-detail',
      label: 'Ver detalle',
      icon: 'pi pi-eye',
      command: () => this.onViewDetail(template)
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.onEdit(template)
    },
    {
      id: 'download-pdf',
      label: 'Descargar PDF',
      icon: 'pi pi-file-pdf',
      command: () => this.onDownloadPdf(template)
    },
    {
      id: 'fill-worksheet',
      label: 'Cargar Resultados',
      icon: 'pi pi-upload',
      command: () => this.onFillWorksheet(template)
    }
  ];

  private worksheetService = inject(WorksheetService);
  private areaService = inject(AreaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private modalService = inject(PrimeModalService);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);

  /**
   * Initializes the component by loading worksheet templates.
   */
  ngOnInit(): void {
    this.loadSections();
    this.loadTemplates();
  }

  /**
   * Loads all sections from the backend to populate the filter dropdown.
   */
  loadSections(): void {
    this.areaService.getAllSections()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sections) => {
          const sectionOptions = [
            { label: 'Todas', value: null, active: true },
            ...sections.map(section => ({
              label: section.name,
              value: section.id,
              active: false
            }))
          ];

          this.filters = [
            {
              id: 'section',
              label: 'Sección',
              type: 'select',
              options: sectionOptions
            }
          ];

          this.cdr.detectChanges();
        },
        error: () => {
          // Keep default filter with empty options if loading fails
        }
      });
  }

  /**
   * Loads all worksheet templates from the backend.
   */
  loadTemplates(): void {
    this.loading.set(true);
    this.cdr.detectChanges();

    this.worksheetService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.templates.set(data);
          this.loading.set(false);
          this.cdr.detectChanges();
        },
        error: () => {
          this.showErrorAlert('No se pudieron cargar las planillas de trabajo.');
          this.loading.set(false);
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Opens the modal to create a new template.
   */
  onCreateNew(): void {
    // Open modal instead of navigating
    this.showTemplateModal.set(true);

    // Original navigation (commented out)
    // this.router.navigate(['/analytical-management/worksheets/templates/new']);
  }

  /**
   * Handles the modal close event after template creation/cancellation
   */
  onModalClosed(): void {
    this.showTemplateModal.set(false);
    this.editingTemplateId.set(undefined);
    // Reload templates to show the newly created/edited one
    this.loadTemplates();
    // Note: The template-management component will reset its own form data
    // when it's destroyed and recreated on next modal open
  }

  /**
   * Handles filter changes from the generic table component.
   */
  onFilterChange(event: FilterChangeEvent): void {
    const sectionFilter = event.filters.find(f => f.id === 'section');
    if (sectionFilter) {
      this.activeSectionFilter.set(sectionFilter.value as number | null);
    }
  }

  /**
   * Opens the modal to edit a template.
   */
  onEdit(template: WorkSheetTemplateViewDTO): void {
    const id = template.worksheetId ?? template.analysisId ?? template.id;
    if (id == null) {
      this.showErrorAlert('No se encontró el identificador de la planilla para editar.');
      return;
    }

    // Set the template ID for editing and open modal
    this.editingTemplateId.set(id);
    this.showTemplateModal.set(true);

    // Original navigation (commented out)
    // this.router.navigate(['/analytical-management/worksheets/templates/edit', id]);
  }

  /**
   * Navigates to the worksheet fill form.
   */
  onFillWorksheet(template: WorkSheetTemplateViewDTO): void {
    const rawId = template.worksheetId ?? template.analysisId ?? template.id;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      this.showErrorAlert('No se encontró el identificador de la planilla para cargar resultados.');
      return;
    }
    // Get sectionId from template
    const sectionId = template.sectionId ?? 5;
    this.router.navigate(['/analytical-management/worksheets/fill/', id], { queryParams: { sectionId } });
  }

  /**
   * Downloads the blank PDF for the template.
   */
  onDownloadPdf(template: WorkSheetTemplateViewDTO): void {
    const id = template.worksheetId ?? template.analysisId ?? template.id;
    if (id == null) {
      this.showErrorAlert('No se encontró el identificador de la planilla para descargar el PDF.');
      return;
    }

    this.worksheetService.downloadPdf(id).subscribe({
      next: ({ blob, filename }) => {
        // Create blob URL
        const url = window.URL.createObjectURL(blob);

        // Create temporary anchor element for download
        const link = document.createElement('a');
        link.href = url;
        // Use worksheetName from template
        const worksheetName = template.worksheetName ?? template.name ?? 'planilla';
        link.download = filename || `${worksheetName.replace(/\s+/g, '_')}_${id}.pdf`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.showSuccessAlert('PDF descargado correctamente');
      },
      error: () => {
        this.showErrorAlert('No se pudo generar el PDF');
      }
    });
  }

  /**
   * Shows success alert.
   */
  private showSuccessAlert(message: string): void {
    this.alertType.set('success');
    this.alertTitle.set('Éxito');
    this.alertMessage.set(message);
    this.showAlert.set(true);
    this.autoHideAlert();
  }

  /**
   * Shows error alert.
   */
  private showErrorAlert(message: string): void {
    this.alertType.set('error');
    this.alertTitle.set('Error');
    this.alertMessage.set(message);
    this.showAlert.set(true);
    this.autoHideAlert();
  }

  /**
   * Auto-hides alert after 4 seconds.
   */
  private autoHideAlert(): void {
    setTimeout(() => {
      this.showAlert.set(false);
    }, 4000);
  }

  /**
   * Shows the detail of the worksheet template in a modal.
   */
  onViewDetail(template: WorkSheetTemplateViewDTO): void {
    // Store the template details and open the detail modal
    this.worksheetDetail.set(template);
    this.showDetailModal.set(true);
  }

  /**
   * Handles detail modal close event
   */
  onDetailModalClosed(): void {
    this.showDetailModal.set(false);
    this.worksheetDetail.set(null);
  }

  /**
   * Handles export to Excel or PDF
   * @param filteredData - Filtered data from the table
   * @param event - Export event with type
   */
  async onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);

    try {
      // Use filtered templates for export
      const dataToExport = filteredData.length > 0 ? filteredData : this.filteredTemplates();
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: WORKSHEET_EXPORT_COLUMNS,
          fileName: 'planillas_trabajo',
          sheetName: 'Planillas',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: WORKSHEET_PDF_COLUMNS,
          fileName: 'planillas_trabajo',
          title: 'Listado de planillas de trabajo',
          orientation: 'portrait',
          includeDate: true,
          includeTimestamp: true,
          logo: {
            path: '/lcc_negativo.png',
            width: 48,
            height: 14.4,
            x: 80,
            y: 8
          }
        });
      }

      if (result?.success) {
        this.alertType.set('success');
        this.alertTitle.set('Éxito');
        this.alertMessage.set('Las planillas se exportaron correctamente.');
        this.showAlert.set(true);
        this.autoHideAlert();
      } else {
        this.alertType.set('error');
        this.alertTitle.set('Error');
        this.alertMessage.set(result?.error || 'No se pudo generar el archivo de exportación.');
        this.showAlert.set(true);
        this.autoHideAlert();
      }
    } catch {
      this.alertType.set('error');
      this.alertTitle.set('Error');
      this.alertMessage.set('No se pudo generar el archivo de exportación.');
      this.showAlert.set(true);
      this.autoHideAlert();
    } finally {
      this.loading.set(false);
    }
  }
}
