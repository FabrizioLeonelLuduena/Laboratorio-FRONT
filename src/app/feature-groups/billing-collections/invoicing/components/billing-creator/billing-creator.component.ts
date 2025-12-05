import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

import { GenericAlertComponent, AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { HelpCenterService } from '../../../../../shared/services/help-center.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { BillingService } from '../../application/billing.service';
import { InvoicePdfService } from '../../application/invoice-pdf.service';
import { INVOICING_HELP_CONTENT } from '../../constants/invoicing-help.config';
import { Billing, BillingItem, InvoiceableType, PaymentMethodDetail } from '../../domain';
import { Invoiceable } from '../../domain';
import { BillingMapper } from '../../mappers/billing.mapper';
import { BillingCreatorStep, BillingCreatorViewModel } from '../../view-models/billing-creator.vm';

import { InvoiceDataStepComponent } from './steps/invoice-data-step/invoice-data-step.component';
import { InvoiceItemsStepComponent } from './steps/invoice-items-step/invoice-items-step.component';
import { SummaryStepComponent } from './steps/summary-step/summary-step.component';


/**
 * BillingCreatorComponent - Single view billing creator
 * Manages the state for billing creation in a single view (no stepper)
 */
@Component({
  selector: 'app-billing-creator',
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    InvoiceDataStepComponent,
    InvoiceItemsStepComponent,
    SummaryStepComponent,
    ConfirmationModalComponent,
    GenericButtonComponent,
    GenericAlertComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './billing-creator.component.html',
  styleUrls: ['./billing-creator.component.scss']
})
export class BillingCreatorComponent implements OnInit, OnDestroy {
  // ViewChild references for direct method calls to step components
  @ViewChild(InvoiceDataStepComponent) invoiceDataStep?: InvoiceDataStepComponent;
  @ViewChild(InvoiceItemsStepComponent) invoiceItemsStep?: InvoiceItemsStepComponent;
  @ViewChild('summaryPreview') summaryPreviewComponent?: SummaryStepComponent;

  // Alert state
  showAlert = false;
  alertType: AlertType = 'info';
  alertTitle = '';
  alertText = '';

  // Preview modal state
  showPreviewModal = false;
  confirmationModalVisible = false;
  confirmationModalTitle = '';
  confirmationModalMessage = '';
  confirmationModalIcon = 'pi pi-exclamation-triangle';
  private pendingConfirmationAction?: () => void;

  // View Model with signals for reactive state management
  readonly viewModel = signal<BillingCreatorViewModel>({
    billing: BillingMapper.createEmpty(),
    isSubmitting: false,
    isLoading: false,
    error: null,
    validationErrors: {},
    currentStep: BillingCreatorStep.INVOICE_DATA,
    isDirty: false,
    invoiceDataValid: false,
    itemsValid: false,
    totalsValid: false,
    paymentMethodsValid: false
  });

  // Computed signals for reactive values
  readonly billing = computed(() => this.viewModel().billing);
  readonly isSubmitting = computed(() => this.viewModel().isSubmitting);
  readonly isLoading = computed(() => this.viewModel().isLoading);
  readonly grandTotal = computed(() => this.billing().totalInvoice || 0);
  readonly canSubmit = computed(() => {
    const vm = this.viewModel();
    const billing = this.billing();
    return (
      vm.invoiceDataValid &&
      vm.itemsValid &&
      billing.items.length > 0 &&
      !vm.isSubmitting
    );
  });

  // Expose step enum to template
  readonly BillingCreatorStep = BillingCreatorStep;

  /** Invoiceable entity if creating invoice from transaction/payment */
  private invoiceable: Invoiceable | null = null;
  private readonly billingService = inject(BillingService);
  private readonly invoicePdfService = inject(InvoicePdfService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly helpCenterService = inject(HelpCenterService);
  private breadcrumbService = inject(BreadcrumbService);

  /**
   * Angular lifecycle hook. Loads sample data on initialization.
   */
  ngOnInit(): void {
    // Set page title for breadcrumb
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Nueva factura' }
    ]);

    // Load help content for this module
    this.helpCenterService.show(INVOICING_HELP_CONTENT);

    // Check if navigated from invoice list with invoiceable data
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state && state['invoiceable']) {
      this.invoiceable = state['invoiceable'] as Invoiceable;

      // Pre-fill billing data from invoiceable
      this.prefillBillingFromInvoiceable(this.invoiceable);
    }
  }

  /**
   * Angular lifecycle hook. Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    // Reset title when leaving component
    this.pageTitleService.resetTitle();

    // Clear help content
    this.helpCenterService.clear();
  }

  /**
   * Handle invoice data changes from Step 1
   */
  onInvoiceDataChange(data: Partial<Billing>): void {
    const updatedBilling = { ...this.billing(), ...data };
    this.updateViewModel({
      billing: updatedBilling,
      isDirty: true
    });
  }

  /**
   * Handle invoice data validity changes from Step 1
   */
  onInvoiceDataValidChange(isValid: boolean): void {
    this.updateViewModel({ invoiceDataValid: isValid });
  }

  /**
   * Hides the alert message.
   */
  hideAlertMessage(): void {
    this.showAlert = false;
  }

  /**
   * Handle items changes from Step 2
   */
  onItemsChange(items: BillingItem[]): void {
    const billing = this.billing();
    billing.items = items;
    this.updateViewModel({
      billing: BillingMapper.calculateBillingTotals(billing),
      isDirty: true
    });
  }

  /**
   * Handle items validity changes from Step 2
   */
  onItemsValidChange(isValid: boolean): void {
    this.updateViewModel({ itemsValid: isValid });
  }

  /**
   * Handle totals changes from Step 3
   */
  onTotalsChange(data: Partial<Billing>): void {
    const updatedBilling = { ...this.billing(), ...data };
    this.updateViewModel({
      billing: updatedBilling,
      isDirty: true
    });
  }

  /**
   * Handle totals validity changes from Step 3
   */
  onTotalsValidChange(isValid: boolean): void {
    this.updateViewModel({ totalsValid: isValid });
  }

  /**
   * Handle payment methods changes from Step 4
   */
  onPaymentMethodsChange(paymentMethods: PaymentMethodDetail[]): void {
    const billing = this.billing();
    billing.paymentMethods = paymentMethods;
    this.updateViewModel({
      billing,
      isDirty: true
    });
  }

  /**
   * Handle payment methods validity changes from Step 4
   */
  onPaymentMethodsValidChange(isValid: boolean): void {
    this.updateViewModel({ paymentMethodsValid: isValid });
  }

  /**
   * Show preview dialog with billing summary
   */
  onPreview(): void {
    this.recalculateBillingTotals();
    this.showPreviewModal = true;
  }

  /**
   * Close preview modal
   */
  closePreviewModal(): void {
    this.showPreviewModal = false;
  }

  /**
   *
   */
  /**
   * Closes the confirmation modal and invokes the pending confirmation action, if any.
   */
  onConfirmationModalConfirmed(): void {
    const action = this.pendingConfirmationAction;
    this.closeConfirmationModal();
    action?.();
  }

  /**
   *
   */
  /**
   * Hides the confirmation modal and clears the pending confirmation action.
   */
  closeConfirmationModal(): void {
    this.confirmationModalVisible = false;
    this.pendingConfirmationAction = undefined;
  }

  /**
   *
   */
  /**
   * Open confirmation modal with title/message and register the confirmation action.
   *
   * @param title - Modal title.
   * @param message - Modal message.
   * @param action - Callback to run when confirmed.
   */
  private openConfirmationModal(title: string, message: string, action: () => void): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;
    this.pendingConfirmationAction = action;
    this.confirmationModalVisible = true;
  }

  /**
   * Recalculate billing totals
   */
  recalculateBillingTotals(): void {
    const recalculated = BillingMapper.calculateBillingTotals(this.billing());
    this.updateViewModel({ billing: recalculated });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Final validation
    this.recalculateBillingTotals();

    const billing = this.billing();
    const paymentValidation = BillingMapper.validatePaymentMethods(billing);

    if (!paymentValidation.valid) {
      this.showAlertMessage('error', 'Error de validación', paymentValidation.message ? paymentValidation.message : 'Ocurrió un error en la creación de su factura' );
      return;
    }

    // Generate full invoice number
    billing.fullInvoiceNumber = BillingMapper.generateFullInvoiceNumber(
      billing.invoiceNumberPrefix,
      billing.invoiceNumber
    );

    this.openConfirmationModal(
      'Confirmar factura',
      `¿Deseás crear la factura ${billing.fullInvoiceNumber}?`,
      () => this.createBilling()
    );
  }

  /**
   * Handle save and print action
   */
  onSaveAndPrint(): void {
    // Recalculate and validate
    this.recalculateBillingTotals();

    const billing = this.billing();
    const paymentValidation = BillingMapper.validatePaymentMethods(billing);

    if (!paymentValidation.valid) {
      this.showAlertMessage('error', 'Error de validación', paymentValidation.message! );
      return;
    }

    // Generate full invoice number
    billing.fullInvoiceNumber = BillingMapper.generateFullInvoiceNumber(
      billing.invoiceNumberPrefix,
      billing.invoiceNumber
    );

    // Show confirmation dialog for save and print
    const total = billing.grandTotal || billing.totalInvoice || 0;
    this.confirmationService.confirm({
      header: 'Confirmar y generar PDF',
      message: `¿Deseás crear la factura ${billing.fullInvoiceNumber} y generar un PDF?<br>
                <strong>Total:</strong> $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      acceptLabel: 'Confirmar y generar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.createBillingAndGeneratePdf();
      }
    });
  }

  /**
   * Download PDF of current billing (without saving)
   */
  onDownloadPdf(): void {
    this.recalculateBillingTotals();
    const billing = this.billing();

    try {
      this.invoicePdfService.downloadInvoicePDF(billing);
      this.showAlertMessage('success', 'PDF generado', 'El archivo PDF se descargó correctamente', 3000);
    } catch {
      this.showAlertMessage('error', 'Error al generar PDF', 'No fue posible generar el archivo PDF');
    }
  }

  /**
   * Preview PDF in new tab (without saving)
   */
  onPreviewPdf(): void {
    this.recalculateBillingTotals();
    const billing = this.billing();

    try {
      this.invoicePdfService.previewInvoicePDF(billing);
    } catch {
      this.showAlertMessage('error', 'Error al generar PDF', 'No fue posible generar el archivo PDF');
    }
  }

  /**
   * Create billing via API
   * Uses invoice reference endpoint if invoiceable exists, otherwise uses direct creation
   */
  private createBilling(): void {
    this.updateViewModel({ isSubmitting: true });

    // Check if we have an invoiceable (coming from invoice list)
    if (this.invoiceable) {
      // Use new invoice reference endpoint
      this.billingService.createInvoiceReference(
        this.billing(),
        this.invoiceable.id,
        this.invoiceable.type === InvoiceableType.PAYMENT
      ).subscribe({
        next: () => {
          this.showAlertMessage('success', 'Factura creada', 'La referencia de factura se creó correctamente', 3000);

          this.updateViewModel({ isSubmitting: false, isDirty: false });

          // Navigate back to list after short delay
          setTimeout(() => {
            this.router.navigate(['/billing-collections/invoicing']);
          }, 2000);
        },
        error: () => {
          this.handleSubmitError();
        }
      });
    } else {
      // Use legacy direct billing creation
      this.billingService.createBilling(this.billing()).subscribe({
        next: (createdBilling) => {
          this.showAlertMessage(
            'success',
            'Factura creada',
            `La factura ${createdBilling.fullInvoiceNumber} se creó correctamente`,
            3000
          );

          this.updateViewModel({ isSubmitting: false, isDirty: false });

          // Generate PDF automatically after successful creation
          this.generateInvoicePDF(createdBilling);

          // Navigate back to list after short delay
          setTimeout(() => {
            this.router.navigate(['/billing-collections/invoicing']);
          }, 2000);
        },
        error: () => {
          this.handleSubmitError();
        }
      });
    }
  }

  /**
   * Create billing and generate PDF after successful creation
   */
  private createBillingAndGeneratePdf(): void {
    this.updateViewModel({ isSubmitting: true });

    this.billingService.createBilling(this.billing()).subscribe({
      next: (createdBilling) => {
        this.showAlertMessage(
          'success',
          'Factura creada',
          `La factura ${createdBilling.fullInvoiceNumber} se creó correctamente`,
          3000
        );

        this.updateViewModel({ isSubmitting: false, isDirty: false });

        // Generate and download PDF
        try {
          this.invoicePdfService.downloadInvoicePDF(createdBilling);
          this.showAlertMessage('success', 'PDF generado', 'El archivo PDF se descargó correctamente', 3000);
        } catch {
          this.showAlertMessage('error', 'Error al generar PDF', 'No fue posible generar el archivo PDF');
        }

        // Navigate back to list after delay
        setTimeout(() => {
          this.router.navigate(['/billing-collections/invoicing']);
        }, 2000);
      },
      error: () => {
        this.handleSubmitError();
      }
    });
  }

  /**
   * Generate PDF for the invoice
   */
  private generateInvoicePDF(billing: Billing): void {
    // Now using jsPDF
    try {
      this.invoicePdfService.downloadInvoicePDF(billing);
    } catch {
      // Silent fail - error is already logged in downloadPdf method
    }

    /* COMMENTED OUT - Will be re-enabled in separate PR after dependency approval
    // Wait for the next tick to ensure the component is rendered if preview is open
    setTimeout(() => {
      // If the preview modal is open, we can use that rendered element
      // Otherwise, we'll need to render it temporarily
      const summaryElement = this.summaryPreviewComponent;

      if (summaryElement) {
        // Try to get the rendered HTML from the ViewChild component
        import('html2pdf.js').then((html2pdf) => {
          const options: any = {
            margin: 10,
            filename: `invoice-${billing.fullInvoiceNumber || 'no-number'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, dpi: 192, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // Find the preview element in the DOM
          const previewContainer = document.querySelector('.preview-modal-content app-summary-step');

          if (previewContainer) {
            const pdfWorker: any = html2pdf.default();
            pdfWorker
              .set(options)
              .from(previewContainer)
              .save()
              .then(() => {
                this.showAlertMessage(
                  'info',
                  'PDF generated',
                  'The invoice PDF was downloaded successfully',
                  3000
                );
              })
              .catch((error: any) => {
                console.error('Error generating PDF:', error);
                this.showAlertMessage(
                  'warning',
                  'Failed to generate PDF',
                  'The invoice was created but there was a problem generating the PDF'
                );
              });
          } else {
            // If preview not open, show it briefly to generate PDF
            this.showPreviewModal = true;
            setTimeout(() => {
              const tempPreview = document.querySelector('.preview-modal-content app-summary-step');
              if (tempPreview) {
                const pdfWorker: any = html2pdf.default();
                pdfWorker
                  .set(options)
                  .from(tempPreview)
                  .save()
                  .then(() => {
                    this.showPreviewModal = false;
                    this.showAlertMessage(
                      'info',
                      'PDF generated',
                      'The invoice PDF was downloaded successfully',
                      3000
                    );
                  });
              }
            }, 500);
          }
        }).catch((error) => {
          console.error('Error loading html2pdf:', error);
        });
      }
    }, 100);
    */
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    if (this.viewModel().isDirty) {
      this.openConfirmationModal(
        'Cancelar factura',
        '¿Seguro que querés cancelar? Se perderán los cambios no guardados.',
        () => this.router.navigate(['/billing-collections/invoicing'])
      );
    } else {
      this.router.navigate(['/billing-collections/invoicing']);
    }
  }

  /**
   * Update view model with partial data
   */
  private updateViewModel(partial: Partial<BillingCreatorViewModel>): void {
    this.viewModel.update(current => ({ ...current, ...partial }));
  }

  /**
   * Displays a generic error message and resets submission state.
   */
  private handleSubmitError(): void {
    this.showAlertMessage('error', 'Error', 'La factura no pudo crearse. Intentalo nuevamente.');
    this.updateViewModel({ isSubmitting: false });
  }

  /**
   * Get total payments amount
   */
  getTotalPayments(): number {
    return this.billing().paymentMethods?.reduce((sum, pm) => sum + (pm.amount || 0), 0) || 0;
  }

  /**
   * Get remaining balance
   */
  getRemainingBalance(): number {
    return this.grandTotal() - this.getTotalPayments();
  }

  /**
   * Open attachment dialog
   * TODO: Implement file upload dialog
   */
  openAttachmentDialog(): void {
    // TODO: Implement file upload functionality
    this.showAlertMessage('info', 'Próximamente', 'La funcionalidad de adjuntos estará disponible pronto', 3000);
  }

  /**
   * Pre-fill billing data from invoiceable entity
   * Automatically populates amount and description from the transaction/payment
   */
  private prefillBillingFromInvoiceable(invoiceable: Invoiceable): void {
    const currentBilling = this.billing();
    const today = new Date().toISOString().split('T')[0];

    // Update billing with invoiceable data
    const updatedBilling: Billing = {
      ...currentBilling,
      description: invoiceable.description,
      // You can prefill amount as a single item or leave it for the user
      // For now, just setting the description
      invoiceDate: today,
      paymentDate: today
    };

    this.updateViewModel({
      billing: updatedBilling
    });

  }

  /**
   * Shows an alert message and hides it after a duration.
   */
  private showAlertMessage(type: AlertType, title: string, text: string, duration: number = 4000): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.showAlert = true;

    if (duration > 0) {
      setTimeout(() => {
        this.hideAlertMessage();
      }, duration);
    }
  }
}
