import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, ViewChild, AfterViewInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MultiSelect, MultiSelectModule } from 'primeng/multiselect';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { AnalysisBasicDTO } from '../../models/worksheet/worksheet-form.interface';
import { WorkSheetTemplateViewDTO } from '../../models/worksheet/worksheet.interface';
import { AnalysisService } from '../../services/analysis.service';
import { CreateWorksheetTemplateDTO, WorksheetService } from '../../services/worksheets/worksheet.service';

/**
 * Component for managing worksheet templates.
 * Allows users to create, edit, delete and view worksheet templates.
 */
@Component({
  selector: 'app-template-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericButtonComponent,
    GenericAlertComponent,
    SpinnerComponent,
    MultiSelectModule
  ],
  templateUrl: './template-management.component.html',
  styleUrls: ['./template-management.component.css']
})
export class TemplateManagementComponent implements OnInit, AfterViewInit {
  /**
   * Input to control if component is being used inside a modal
   */
  @Input() isModal = false;

  /**
   * Input to specify the template ID for editing (when in modal mode)
   */
  @Input() templateId?: number;

  /**
   * Output event emitted when template is saved or modal should close
   */
  @Output() modalClosed = new EventEmitter<void>();

  /**
   * Reference to the MultiSelect component for programmatic control
   */
  @ViewChild('analysisMultiSelect', { static: false }) analysisMultiSelect?: MultiSelect;

  private worksheetService = inject(WorksheetService);
  private analysisService = inject(AnalysisService);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  templates: WorkSheetTemplateViewDTO[] = [];
  availableAnalyses: AnalysisBasicDTO[] = [];
  loading = false;
  loadingAnalyses = signal(false);
  displayDialog = false;
  isEditMode = false;
  currentTemplateId?: number;

  // Form data
  templateName = '';
  selectedAnalyses: number[] = [];
  selectedAnalysesDetails: AnalysisBasicDTO[] = [];

  // Alert state
  showAlert = false;
  alertType: 'success' | 'error' | 'warning' = 'success';
  alertTitle = '';
  alertMessage = '';

  // Confirmation dialog
  showConfirmation = false;
  confirmationMessage = '';
  templateToDelete?: WorkSheetTemplateViewDTO;

  // Table configuration
  columns = [
    { field: 'id', header: 'ID' },
    { field: 'name', header: 'Nombre' },
    { field: 'analysisCount', header: 'Cantidad de Análisis' },
    { field: 'createdAt', header: 'Fecha de Creación' }
  ];

  tableConfig = {
    showGlobalFilter: true,
    showActions: true,
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    expandable: false,
    exportCsv: false,
    rowClickable: false
  };

  actionItems = [
    { type: 'edit', label: 'Editar', icon: 'pi pi-pencil' },
    { type: 'pdf', label: 'Descargar PDF', icon: 'pi pi-file-pdf' },
    { type: 'delete', label: 'Eliminar', icon: 'pi pi-trash' }
  ];

  /**
   * Sets up multiselect click listener after view initialization
   */
  ngAfterViewInit(): void {
    // Add click listener to multiselect to focus filter when opened
    if (this.analysisMultiSelect) {
      const multiSelectEl = this.analysisMultiSelect.el.nativeElement;
      multiSelectEl.addEventListener('click', () => {
        this.focusFilterInput();
      });
    }
    return;
  }

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Plantillas de trabajo');
    this.breadcrumbService.buildFromRoute(this.route);

    // If component is used in modal mode, skip template loading and route checks
    if (this.isModal) {
      // Reset form completely for modal mode
      this.templateName = '';
      this.selectedAnalyses = [];
      this.selectedAnalysesDetails = [];
      this.currentTemplateId = undefined;
      this.displayDialog = false;
      this.loadingAnalyses.set(false);

      // Load available analyses
      this.loadAvailableAnalyses();

      // Check if we're editing a template (templateId provided)
      if (this.templateId) {
        this.isEditMode = true;
        this.loadTemplateForEdit(this.templateId);
      } else {
        this.isEditMode = false;
      }

      return;
    }

    // Load available analyses for normal mode
    this.loadAvailableAnalyses();

    this.resetForm();

    // Normal mode: load templates and check route for editing
    this.loadTemplates();

    // Check if there's an id parameter in the route for editing
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      // We're in edit mode, load the template
      this.loadTemplateForEdit(Number(templateId));
    } else {
      // We're in create mode
      this.isEditMode = false;
      this.displayDialog = true;
      // Ensure the form is in a clean state
      this.templateName = '';
      this.selectedAnalyses = [];
      this.selectedAnalysesDetails = [];
    }
  }

  /**
   * Loads a template for editing by ID
   */
  private loadTemplateForEdit(templateId: number): void {
    this.loading = true;
    this.worksheetService.getById(templateId).subscribe({
      next: (template) => {
        this.isEditMode = true;
        this.currentTemplateId = template.analysisId;
        this.templateName = template.name;
        this.selectedAnalyses = template.analyses?.map(a => a.analysisId) || [];
        this.updateSelectedAnalysesDetails();
        this.displayDialog = true;
        this.loading = false;
      },
      error: () => {
        this.showErrorAlert('No se pudo cargar la plantilla para editar');
        this.loading = false;
        // Navigate back to the list if loading fails
        this.router.navigate(['/analytical-management/analytical']);
      }
    });
  }

  /**
   * Loads all available worksheet templates
   */
  loadTemplates(): void {
    this.loading = true;
    this.worksheetService.getAll().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.loading = false;
      },
      error: () => {
        this.showErrorAlert('No se pudieron cargar las plantillas');
        this.loading = false;
      }
    });
  }

  /**
   * Loads all available analyses for selection
   */
  loadAvailableAnalyses(): void {
    this.loadingAnalyses.set(true);
    this.analysisService.getBasicAnalyses().subscribe({
      next: (analyses) => {
        // Add a searchField property for filtering by "shortCode - name"
        this.availableAnalyses = analyses.map(a => ({
          ...a,
          searchField: `${a.shortCode} - ${a.name}`
        }));
        this.loadingAnalyses.set(false);
      },
      error: () => {
        this.showErrorAlert('No se pudieron cargar los análisis disponibles');
        this.loadingAnalyses.set(false);
      }
    });
  }

  /**
   * Handles table action events
   */
  onTableAction(event: { type: string; row: Record<string, any> }): void {
    const { type, row } = event;
    const template = row as WorkSheetTemplateViewDTO;

    switch (type) {
    case 'edit':
      this.editTemplate(template);
      break;
    case 'pdf':
      // Use analysisId or fallback to id (some responses/table rows may use `id`)
      const pdfId = template.analysisId ?? template.id;
      if (pdfId == null) {
        this.showErrorAlert('No se encontró el identificador de la planilla para descargar el PDF');
        return;
      }
      this.downloadPdf(pdfId);
      break;
    case 'delete':
      this.confirmDelete(template);
      break;
    }
  }

  /**
   * Opens the dialog to create a new template
   */
  openNewTemplateDialog(): void {
    this.resetForm();
    this.isEditMode = false;
    this.displayDialog = true;
    // Ensure the form is in a clean state
    this.templateName = '';
    this.selectedAnalyses = [];
    this.selectedAnalysesDetails = [];
  }

  /**
   * Opens the dialog to edit an existing template
   */
  editTemplate(template: WorkSheetTemplateViewDTO): void {
    // Always load full template details from the server to ensure we have all data
    this.loading = true;
    this.worksheetService.getById(template.analysisId).subscribe({
      next: (fullTemplate) => {
        // Set edit mode and template data
        this.isEditMode = true;
        this.currentTemplateId = fullTemplate.analysisId;
        this.templateName = fullTemplate.name;
        // Map analysisId from the loaded template
        // Try both camelCase and snake_case
        this.selectedAnalyses = fullTemplate.analyses?.map(a => a.analysisId) || [];

        this.updateSelectedAnalysesDetails();
        this.displayDialog = true;
        this.loading = false;
      },
      error: () => {
        this.showErrorAlert('No se pudieron cargar los detalles de la planilla');
        this.loading = false;
      }
    });
  }

  /**
   * Shows confirmation dialog for delete
   */
  confirmDelete(template: WorkSheetTemplateViewDTO): void {
    this.templateToDelete = template;
    this.confirmationMessage = `¿Está seguro que desea eliminar la planilla "${template.name}"?`;
    this.showConfirmation = true;
  }

  /**
   * Deletes a template after confirmation
   */
  onConfirmDelete(): void {
    if (!this.templateToDelete) return;

    this.worksheetService.delete(this.templateToDelete.analysisId).subscribe({
      next: () => {
        this.showSuccessAlert('Planilla eliminada correctamente');
        this.loadTemplates();
        this.showConfirmation = false;
        this.templateToDelete = undefined;
      },
      error: () => {
        this.showErrorAlert('No se pudo eliminar la planilla');
        this.showConfirmation = false;
      }
    });
  }

  /**
   * Cancels the delete confirmation
   */
  onCancelDelete(): void {
    this.showConfirmation = false;
    this.templateToDelete = undefined;
  }

  /**
   * Validates if the form is ready to be submitted
   */
  isFormValid(): boolean {
    return this.templateName.trim().length > 0 && this.selectedAnalyses.length > 0;
  }

  /**
   * Saves the template (create or update)
   */
  saveTemplate(): void {
    if (!this.templateName.trim()) {
      this.showErrorAlert('El nombre de la plantilla es requerido');
      return;
    }

    if (this.selectedAnalyses.length === 0) {
      this.showErrorAlert('Debe seleccionar al menos un análisis');
      return;
    }

    // Build template data with camelCase naming (will be converted to snake_case by service)
    const templateData: CreateWorksheetTemplateDTO = {
      name: this.templateName,
      analyses: this.selectedAnalyses.map((analysisId, index) => ({
        analysisId: analysisId,
        displayOrder: index + 1
      }))
    };

    this.loading = true;

    const operation = this.isEditMode && this.currentTemplateId
      ? this.worksheetService.update(this.currentTemplateId, templateData)
      : this.worksheetService.create(templateData);

    operation.subscribe({
      next: () => {
        this.showSuccessAlert(
          this.isEditMode
            ? 'Plantilla actualizada correctamente'
            : 'Plantilla creada correctamente'
        );
        this.displayDialog = false;
        this.loading = false;

        // If in modal mode, emit event and close
        if (this.isModal) {
          setTimeout(() => {
            this.loadingAnalyses.set(false);
            this.modalClosed.emit();
          }, 1500);
        } else {
          // Normal mode: reload templates and navigate
          this.loadTemplates();
          setTimeout(() => {
            this.router.navigate(['/analytical-management/analytical']);
          }, 1500);
        }
      },
      error: (error) => {
        let errorMessage = this.isEditMode
          ? 'No se pudo actualizar la plantilla'
          : 'No se pudo crear la plantilla';

        // Show error details if available
        if (error.error?.message) {
          errorMessage += ': ' + error.error.message;
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }

        this.showErrorAlert(errorMessage);
        this.loading = false;
      }
    });
  }

  /**
   * Downloads the template as PDF
   */
  downloadPdf(templateId: number): void {
    this.worksheetService.downloadPdf(templateId).subscribe({
      next: ({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `plantilla-${templateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showSuccessAlert('PDF descargado correctamente');
      },
      error: () => {
        this.showErrorAlert('No se pudo descargar el PDF');
      }
    });
  }

  /**
   * Updates the selected analyses details when selection changes
   */
  onAnalysisSelectionChange(): void {
    this.updateSelectedAnalysesDetails();
  }

  /**
   * Focuses on the multiselect filter input
   */
  focusFilterInput(): void {
    setTimeout(() => {
      if (this.analysisMultiSelect?.filterInputChild?.nativeElement) {
        this.analysisMultiSelect.filterInputChild.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Updates the selected analyses details array
   */
  private updateSelectedAnalysesDetails(): void {
    const analysisMap = new Map(this.availableAnalyses.map(a => [a.id, a]));
    this.selectedAnalysesDetails = this.selectedAnalyses
      .map(id => analysisMap.get(id))
      .filter((a): a is AnalysisBasicDTO => !!a);
  }

  /**
   * Removes an analysis from selection
   */
  removeAnalysis(analysisId: number): void {
    this.selectedAnalyses = this.selectedAnalyses.filter(id => id !== analysisId);
    this.updateSelectedAnalysesDetails();
  }

  /**
   * Moves an analysis up in the order
   */
  moveAnalysisUp(index: number): void {
    if (index > 0) {
      const updatedAnalyses = [...this.selectedAnalyses];
      [updatedAnalyses[index - 1], updatedAnalyses[index]] = [updatedAnalyses[index], updatedAnalyses[index - 1]];
      this.selectedAnalyses = updatedAnalyses;
      this.updateSelectedAnalysesDetails();
    }
  }

  /**
   * Moves an analysis down in the order
   */
  moveAnalysisDown(index: number): void {
    if (index < this.selectedAnalyses.length - 1) {
      const temp = this.selectedAnalyses[index];
      this.selectedAnalyses[index] = this.selectedAnalyses[index + 1];
      this.selectedAnalyses[index + 1] = temp;
      this.updateSelectedAnalysesDetails();
    }
  }

  /**
   * Resets the form to initial state
   */
  resetForm(): void {
    this.templateName = '';
    this.selectedAnalyses = [];
    this.selectedAnalysesDetails = [];
    this.currentTemplateId = undefined;
  }


  /**
   * Shows success alert
   */
  private showSuccessAlert(message: string): void {
    this.alertType = 'success';
    this.alertTitle = 'Éxito';
    this.alertMessage = message;
    this.showAlert = true;
    this.autoHideAlert();
  }

  /**
   * Shows error alert
   */
  private showErrorAlert(message: string): void {
    this.alertType = 'error';
    this.alertTitle = 'Error';
    this.alertMessage = message;
    this.showAlert = true;
    this.autoHideAlert();
  }

  /**
   * Auto-hides alert after 4 seconds
   */
  private autoHideAlert(): void {
    setTimeout(() => {
      this.showAlert = false;
    }, 4000);
  }
}
