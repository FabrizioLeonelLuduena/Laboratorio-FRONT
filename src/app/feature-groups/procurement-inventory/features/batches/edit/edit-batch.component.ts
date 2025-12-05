import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

import { ResponseBatchDTO, BatchUpdateDTO, BatchValidationConstants, BatchStatus } from '../../../models/batches/batches.model';
import { BatchesService } from '../../../services/batches.service';

/**
 * Componente para editar lotes
 */
@Component({
  selector: 'app-edit-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, GenericAlertComponent, ButtonModule, CardModule],
  templateUrl: './edit-batch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditBatchComponent implements OnInit {
  batchForm!: FormGroup;
  batchFields: GenericFormField[] = [];
  batchId!: number;
  batch: ResponseBatchDTO | null = null;
  loading = false;
  saving = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  showAlert = false;

  statusOptions = [
    { label: 'Activo', value: BatchStatus.ACTIVE },
    { label: 'Vencido', value: BatchStatus.EXPIRED },
    { label: 'Agotado', value: BatchStatus.DEPLETED }
  ];

  private fb = inject(FormBuilder);
  private batchesService = inject(BatchesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    this.batchId = +this.route.snapshot.paramMap.get('id')!;
    this.initializeForm();
    this.setupFormFields();
    this.loadBatch();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.batchForm = this.fb.group({
      supplier_id: [null],
      manufacturing_date: [''],
      expiration_date: [''],
      initial_quantity: [null, [Validators.min(BatchValidationConstants.MIN_INITIAL_QUANTITY)]],
      status: ['']
    });
  }

  /**
   * Configura los campos del formulario
   */
  private setupFormFields(): void {
    this.batchFields = [
      { name: 'supplierId', label: 'Proveedor', type: 'number', placeholder: 'ID del proveedor', colSpan: 2 },
      { name: 'status', label: 'Estado', type: 'select', placeholder: 'Seleccione el estado', colSpan: 2, options: this.statusOptions },
      { name: 'manufacturingDate', label: 'Fecha de Fabricación', type: 'date', colSpan: 2 },
      { name: 'expirationDate', label: 'Fecha de Vencimiento', type: 'date', colSpan: 2 },
      { name: 'initialQuantity', label: 'Cantidad Inicial', type: 'number', placeholder: 'Ingrese la cantidad', colSpan: 4, min: BatchValidationConstants.MIN_INITIAL_QUANTITY }
    ];
  }

  /**
   * Carga el lote
   */
  private loadBatch(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.batchesService.getBatchById(this.batchId).subscribe({
      next: (batch) => {
        this.batch = batch;
        this.batchForm.patchValue({
          supplierId: batch.supplierId,
          manufacturingDate: batch.manufacturingDate,
          expirationDate: batch.expirationDate,
          initialQuantity: batch.initialQuantity,
          status: batch.status
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Error al cargar el lote');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Envía el formulario
   */
  onFormSubmit(formData: any): void {
    if (this.batchForm.valid) {
      this.saveBatch(formData);
    } else {
      this.showError('Por favor, verifique los campos');
    }
  }

  /**
   * Guarda el lote
   */
  private saveBatch(formData: any): void {
    this.saving = true;
    this.cdr.markForCheck();
    const batchData: BatchUpdateDTO = { ...formData };
    this.batchesService.updateBatch(this.batchId, batchData).subscribe({
      next: () => {
        this.showSuccess('Lote actualizado correctamente');
        setTimeout(() => this.router.navigate(['/procurement-inventory/batches']), 2000);
      },
      error: (error) => {
        this.showError(error?.error?.message || 'Error al actualizar el lote');
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancela el formulario
   */
  onCancel(): void {
    this.router.navigate(['/procurement-inventory/batches']);
  }

  /**
   * Muestra el mensaje de éxito
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }

  /**
   * Muestra el mensaje de error
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }
}

