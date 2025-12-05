import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';

import { Billing } from '../../../../domain/billing.model';

/**
 * TotalsStepComponent - Step 3 of billing creator
 * Form for totals, perceptions, and document attachments
 */
@Component({
  selector: 'app-totals-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputNumberModule,
    DropdownModule,
    ButtonModule,
    FileUploadModule
  ],
  templateUrl: './totals-step.component.html',
  styleUrls: ['./totals-step.component.scss']
})
export class TotalsStepComponent implements OnInit, OnChanges {
  @Input() billing?: Billing;
  @Output() dataChange = new EventEmitter<Partial<Billing>>();
  @Output() validChange = new EventEmitter<boolean>();

  totalsForm!: FormGroup;
  attachedFiles: string[] = [];

  // IIBB perception type options (example data - prepare for API connection)
  iibbPerceptionTypeOptions = [
    { label: 'IIBB perception Buenos Aires', value: 'IIBB_BA' },
    { label: 'IIBB perception CABA', value: 'IIBB_CABA' },
    { label: 'IIBB perception Cordoba', value: 'IIBB_CBA' },
    { label: 'IIBB perception Santa Fe', value: 'IIBB_SF' },
    { label: 'IIBB perception Mendoza', value: 'IIBB_MZA' },
    { label: 'No perception', value: 'NONE' }
  ];

  /**
   * Constructor for TotalsStepComponent
   * @param fb FormBuilder for creating reactive forms
   * @param messageService Service for displaying toast messages
   */
  constructor(
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService
  ) {}

  /**
   * Angular lifecycle hook. Initializes the form and sets up listeners.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
  }

  /**
   * Angular lifecycle hook. Responds to changes in input properties.
   * @param changes Object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['billing'] && this.totalsForm && this.billing) {
      this.updateFormFromBilling();
    }
  }

  /**
   * Initialize the form with validators
   */
  private initializeForm(): void {
    this.totalsForm = this.fb.group({
      netTaxable: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      netNonTaxable: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      totalVat: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      vatPerception: [{ value: 0, disabled: true }], // Non-editable, calculated
      iibbPerception: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      iibbPerceptionType: ['NONE'],
      totalInvoice: [{ value: 0, disabled: true }] // Non-editable, calculated from items
    });

    // Update form if billing is already available
    if (this.billing) {
      this.updateFormFromBilling();
    }
  }

  /**
   * Setup form listeners to emit changes
   */
  private setupFormListeners(): void {
    // Emit validity changes
    this.totalsForm.statusChanges.subscribe(() => {
      this.validChange.emit(this.totalsForm.valid);
    });

    // Emit data changes
    this.totalsForm.valueChanges.subscribe(value => {
      if (this.totalsForm.valid) {
        const formattedData = this.formatFormData(value);
        this.dataChange.emit(formattedData);
      }
    });

    // Initial validity emission
    this.validChange.emit(this.totalsForm.valid);
  }

  /**
   * Update form values from billing input
   */
  private updateFormFromBilling(): void {
    if (!this.billing) return;

    this.totalsForm.patchValue({
      netTaxable: this.billing.netTaxable || 0,
      netNonTaxable: this.billing.netNonTaxable || 0,
      totalVat: this.billing.totalVat || 0,
      vatPerception: this.billing.vatPerception || 0,
      iibbPerception: this.billing.iibbPerception || 0,
      iibbPerceptionType: this.billing.iibbPerceptionType || 'NONE',
      totalInvoice: this.billing.totalInvoice || 0
    }, { emitEvent: false });

    if (this.billing.attachedDocuments) {
      this.attachedFiles = [...this.billing.attachedDocuments];
    }
  }

  /**
   * Format form data for emission
   */
  private formatFormData(value: any): Partial<Billing> {
    return {
      netTaxable: value.netTaxable || 0,
      netNonTaxable: value.netNonTaxable || 0,
      totalVat: value.totalVat || 0,
      vatPerception: value.vatPerception || 0,
      iibbPerception: value.iibbPerception || 0,
      iibbPerceptionType: value.iibbPerceptionType,
      attachedDocuments: this.attachedFiles.length > 0 ? this.attachedFiles : undefined
    };
  }

  /**
   * Public method for parent component to validate
   */
  public validateForm(): boolean {
    if (this.totalsForm.invalid) {
      Object.keys(this.totalsForm.controls).forEach(key => {
        this.totalsForm.get(key)?.markAsTouched();
      });
      return false;
    }
    return true;
  }

  /**
   * Handle file upload
   * TODO: Implement actual file upload to backend server
   * Currently only stores file names for UI display
   * Security considerations: validate file types, size limits, scan for malware
   */
  onFileUpload(event: any): void {
    const files = event.files;
    if (files && files.length > 0) {
      files.forEach((file: File) => {
        // TODO: Upload file to server and store file reference/URL
        // For now, we'll just store the file name
        this.attachedFiles.push(file.name);
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Archivo adjuntado',
        detail: `${files.length} archivo(s) adjuntado(s) correctamente`,
        life: 2000
      });

      // Emit changes
      const currentValue = this.totalsForm.getRawValue();
      const formattedData = this.formatFormData(currentValue);
      this.dataChange.emit(formattedData);

      // Clear the upload component
      event.originalEvent?.target?.value && (event.originalEvent.target.value = '');
    }
  }

  /**
   * Remove attached file
   */
  removeFile(index: number): void {
    this.attachedFiles.splice(index, 1);

    this.messageService.add({
      severity: 'info',
      summary: 'Archivo eliminado',
      detail: 'El archivo fue eliminado',
      life: 2000
    });

    // Emit changes
    const currentValue = this.totalsForm.getRawValue();
    const formattedData = this.formatFormData(currentValue);
    this.dataChange.emit(formattedData);
  }

  /**
   * Check if field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.totalsForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string {
    const field = this.totalsForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
    }
    return '';
  }

  /**
   * Calculate grand total
   */
  getGrandTotal(): number {
    const netTaxable = this.totalsForm.get('netTaxable')?.value || 0;
    const netNonTaxable = this.totalsForm.get('netNonTaxable')?.value || 0;
    const totalVat = this.totalsForm.get('totalVat')?.value || 0;
    const vatPerception = this.totalsForm.get('vatPerception')?.value || 0;
    const iibbPerception = this.totalsForm.get('iibbPerception')?.value || 0;

    return netTaxable + netNonTaxable + totalVat + vatPerception + iibbPerception;
  }
}

