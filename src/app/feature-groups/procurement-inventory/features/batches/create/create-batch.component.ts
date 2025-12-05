import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';


import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

import { RequestBatchDTO, BatchValidationConstants, BatchStatus } from '../../../models/batches/batches.model';
import { BatchesService } from '../../../services/batches.service';

/**
 * Component for creating batches
 */
@Component({
  selector: 'app-create-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, GenericAlertComponent, ButtonModule, CardModule],
  templateUrl: './create-batch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateBatchComponent implements OnInit {
  batchForm!: FormGroup;
  batchFields: GenericFormField[] = [];
  saving = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  showAlert = false;

  private fb = inject(FormBuilder);
  private batchesService = inject(BatchesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private dialogRef = inject(DynamicDialogRef, { optional: true });

  statusOptions = [
    { label: 'Activo', value: BatchStatus.ACTIVE },
    { label: 'Vencido', value: BatchStatus.EXPIRED },
    { label: 'Agotado', value: BatchStatus.DEPLETED }
  ];

  /**
   * Initializes the form and form fields
   */
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormFields();
  }

  /**
   * Initializes the form
   */
  private initializeForm(): void {
    this.batchForm = this.fb.group({
      supplyId: [null, [Validators.required]],
      supplierId: [null, [Validators.required]],
      batchCode: ['', [Validators.required, Validators.maxLength(BatchValidationConstants.MAX_BATCH_CODE_LENGTH), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      manufacturingDate: ['', [Validators.required]],
      expirationDate: ['', [Validators.required]],
      initialQuantity: [null, [Validators.required, Validators.min(BatchValidationConstants.MIN_INITIAL_QUANTITY)]],
      status: [BatchStatus.ACTIVE, [Validators.required]]
    });
  }

  /**
   * Sets up the form fields
   */
  private setupFormFields(): void {
    this.batchFields = [
      { name: 'batchCode', label: 'Código de Lote', type: 'text', required: true, placeholder: 'Ingrese el código', colSpan: 2, max: BatchValidationConstants.MAX_BATCH_CODE_LENGTH, pattern: /^[a-zA-Z0-9_-]+$/, messages: { required: 'El código es obligatorio', max: `Máximo ${BatchValidationConstants.MAX_BATCH_CODE_LENGTH} caracteres`, pattern: 'Solo letras, números, guiones y guiones bajos' } },
      { name: 'supplyId', label: 'Insumo', type: 'number', required: true, placeholder: 'ID del insumo', colSpan: 2, messages: { required: 'El insumo es obligatorio' } },
      { name: 'supplierId', label: 'Proveedor', type: 'number', required: true, placeholder: 'ID del proveedor', colSpan: 2, messages: { required: 'El proveedor es obligatorio' } },
      { name: 'status', label: 'Estado', type: 'select', required: true, placeholder: 'Seleccione el estado', colSpan: 2, options: this.statusOptions, messages: { required: 'El estado es obligatorio' } },
      { name: 'manufacturingDate', label: 'Fecha de Fabricación', type: 'date', required: true, colSpan: 2, messages: { required: 'La fecha de fabricación es obligatoria' } },
      { name: 'expirationDate', label: 'Fecha de Vencimiento', type: 'date', required: true, colSpan: 2, messages: { required: 'La fecha de vencimiento es obligatoria' } },
      { name: 'initialQuantity', label: 'Cantidad Inicial', type: 'number', required: true, placeholder: 'Ingrese la cantidad', colSpan: 4, min: BatchValidationConstants.MIN_INITIAL_QUANTITY, messages: { required: 'La cantidad es obligatoria', min: `Mínimo ${BatchValidationConstants.MIN_INITIAL_QUANTITY}` } }
    ];
  }

  /**
   * Submits the form
   * The generic-form already validates before emitting, so formData will always be valid
   */
  onFormSubmit(formData: any): void {
    this.saveBatch(formData);
  }

  /**
   * Saves the batch
   */
  private saveBatch(formData: RequestBatchDTO): void {
    this.saving = true;
    this.cdr.markForCheck();

    const batchData: RequestBatchDTO = {
      supplyId: formData.supplyId,
      supplierId: formData.supplierId,
      batchCode: formData.batchCode,
      manufacturingDate: formData.manufacturingDate,
      expirationDate: formData.expirationDate,
      initialQuantity: formData.initialQuantity,
      status: formData.status
    };

    this.batchesService.createBatch(batchData).subscribe({
      next: () => {
        this.showSuccess('Lote creado correctamente');
        setTimeout(() => {
          if (this.dialogRef) {
            this.dialogRef.close({ success: true });
          } else {
            this.router.navigate(['/procurement-inventory/batches']);
          }
        }, 2000);
      },
      error: (error) => {
        this.showError(error?.error?.message || 'Error al crear el lote');
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancels the form or closes the modal
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/procurement-inventory/batches']);
    }
  }

  /**
   * Shows the success message
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }

  /**
   * Shows the error message
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }
}
