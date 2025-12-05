import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { WorkSheetTemplateViewDTO } from '../../models/worksheet/worksheet.interface';
import { WorksheetService } from '../../services/worksheets/worksheet.service';

/**
 * Component for previewing worksheet templates in a read-only view.
 *
 * This component provides a comprehensive interface for:
 * - Displaying detailed information about a worksheet template
 * - Showing all analyses included in the template with their order
 * - Providing quick actions for PDF download and worksheet filling
 * - Supporting navigation back to the list view
 *
 * The component consumes data from the worksheet-list and presents it
 * in a visually organized preview format, ideal for reviewing templates
 * before performing actions on them.
 *
 * @example
 * ```html
 * <app-worksheet-preview></app-worksheet-preview>
 * ```
 */
@Component({
  selector: 'app-worksheet-preview',
  standalone: true,
  imports: [
    CommonModule,
    GenericButtonComponent,
    SpinnerComponent,
    GenericAlertComponent
  ],
  templateUrl: './worksheet-preview.component.html',
  styleUrl: './worksheet-preview.component.css'
})
export class WorksheetPreviewComponent implements OnInit {
  /** The worksheet template being previewed */
  template: WorkSheetTemplateViewDTO | null = null;

  /** Loading state indicator */
  loading = false;

  /** Alert display state and configuration */
  showAlert = false;
  alertType: 'success' | 'error' | 'warning' = 'success';
  alertTitle = '';
  alertMessage = '';

  private worksheetService = inject(WorksheetService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Initializes the component by loading the worksheet template.
   *
   * This lifecycle hook is called after Angular has initialized all data-bound properties.
   * It extracts the template ID from the route and loads the corresponding template data.
   */
  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplate(Number(templateId));
    } else {
      this.showErrorAlert('No se especificó un identificador de planilla válido');
      this.navigateToList();
    }
  }

  /**
   * Loads a specific worksheet template by its ID.
   *
   * Fetches the template data from the API and updates the component state.
   * Handles loading states and error conditions with appropriate user feedback.
   *
   * @param {number} templateId - The unique identifier of the template to load
   * @returns {void}
   *
   * @example
   * ```typescript
   * this.loadTemplate(42);
   * ```
   */
  loadTemplate(templateId: number): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.worksheetService.getById(templateId).subscribe({
      next: (templates) => {
        this.template = templates;

        if (!this.template) {
          this.showErrorAlert('No se encontró la planilla solicitada.');
          setTimeout(() => this.navigateToList(), 2000);
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showErrorAlert('No se pudo cargar la planilla solicitada.');
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.navigateToList(), 2000);
      }
    });
  }

  /**
   * Downloads the blank PDF for the current template.
   *
   * Generates and downloads a PDF version of the worksheet template.
   * Creates a blob URL and triggers a download in the browser.
   *
   * @returns {void}
   */
  onDownloadPdf(): void {
    if (!this.template) return;

    const id = this.template.analysisId ?? (this.template as any).id;
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
        link.download = filename || `${this.template!.name.replace(/\s+/g, '_')}_${id}.pdf`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.showSuccessAlert('PDF descargado correctamente.');
      },
      error: () => {
        this.showErrorAlert('No se pudo generar el PDF.');
      }
    });
  }

  /**
   * Navigates to the worksheet fill form for the current template.
   *
   * Redirects to the form for filling out the worksheet with analysis results.
   *
   * @returns {void}
   */
  onFillWorksheet(): void {
    if (!this.template) return;
    const rawId = this.template.analysisId ?? (this.template as any).id;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      this.showErrorAlert('No se encontró el identificador de la planilla para cargar resultados.');
      return;
    }
    this.router.navigate(['/analytical-management/worksheets/fill/', id], { queryParams: { sectionId: 5 } });
  }

  /**
   * Navigates to the template edit form.
   *
   * Redirects to the edit page for the current template.
   *
   * @returns {void}
   */
  onEdit(): void {
    if (!this.template) return;
    const id = this.template.analysisId ?? (this.template as any).id;
    if (id == null) {
      this.showErrorAlert('No se encontró el identificador de la planilla para editar.');
      return;
    }
    // Navigate to edit page
    this.router.navigate(['/analytical-management/worksheets/templates/edit', id]);
  }

  /**
   * Navigates back to the worksheet list view.
   *
   * Returns the user to the main worksheet list page.
   *
   * @returns {void}
   */
  navigateToList(): void {
    this.router.navigate(['/analytical-management/worksheets']);
  }

  /**
   * Displays a success alert message.
   *
   * Shows a success-styled alert with the provided message and automatically
   * hides it after 3 seconds.
   *
   * @param {string} message - The success message to display
   * @returns {void}
   *
   * @private
   */
  private showSuccessAlert(message: string): void {
    this.alertType = 'success';
    this.alertTitle = 'Éxito';
    this.alertMessage = message;
    this.showAlert = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showAlert = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  /**
   * Displays an error alert message.
   *
   * Shows an error-styled alert with the provided message and automatically
   * hides it after 4 seconds.
   *
   * @param {string} message - The error message to display
   * @returns {void}
   *
   * @private
   */
  private showErrorAlert(message: string): void {
    this.alertType = 'error';
    this.alertTitle = 'Error';
    this.alertMessage = message;
    this.showAlert = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showAlert = false;
      this.cdr.detectChanges();
    }, 4000);
  }
}
