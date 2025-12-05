import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';

import { GenericAlertComponent } from '../../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../../shared/components/generic-button/generic-button.component';
import { DeterminationDto, DeterminationEditDto, ResultStatus, StudyStatus } from '../../../models/models';

/**
 * Dialog component for editing determinations
 */
@Component({
  selector: 'app-edit-determinations-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputText,
    InputTextarea,
    GenericAlertComponent,
    GenericButtonComponent
  ],
  template: `
    <div class="edit-determinations-dialog">
      <!-- Alert messages -->
      <app-generic-alert
        *ngIf="studyStatus === StudyStatus.CLOSED"
        type="error"
        title="Estudio cerrado"
        text="No se puede editar determinaciones de un estudio cerrado (firma final)"
        class="mb-3">
      </app-generic-alert>

      <app-generic-alert
        *ngIf="resultStatus === ResultStatus.SIGNED && studyStatus !== StudyStatus.CLOSED"
        type="warning"
        title="Resultado firmado"
        text="Este resultado está firmado. Solo puedes agregar nuevas determinaciones, no editar las existentes."
        class="mb-3">
      </app-generic-alert>

      <form [formGroup]="form" class="edit-form">
        <div formArrayName="determinations">
          <div *ngFor="let detGroup of determinationsArray.controls; let i = index"
               [formGroupName]="i"
               class="determination-row">
            <div class="determination-header">
              <h4>{{ getDeterminationName(i) }}</h4>
              <span *ngIf="isExistingDetermination(i)" class="badge-existing">EXISTENTE</span>
              <span *ngIf="!isExistingDetermination(i)" class="badge-new">NUEVA</span>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label [for]="'value-' + i">
                  Valor 
                  <span class="required" *ngIf="isExistingDetermination(i)">*</span>
                  <span class="optional" *ngIf="!isExistingDetermination(i)">(opcional)</span>
                </label>
                <input
                  pInputText
                  [id]="'value-' + i"
                  formControlName="value"
                  [readonly]="isReadOnly(i)"
                  placeholder="Ingrese el valor"
                  class="w-full" />
                <small class="p-error" *ngIf="getControl(i, 'value')?.invalid && getControl(i, 'value')?.touched">
                  El valor es requerido
                </small>
              </div>

              <div class="form-field">
                <label [for]="'observations-' + i">Observaciones</label>
                <textarea
                  pInputTextarea
                  [id]="'observations-' + i"
                  formControlName="observations"
                  [readonly]="isReadOnly(i)"
                  placeholder="Ingrese observaciones (opcional)"
                  [rows]="2"
                  class="w-full">
                </textarea>
              </div>
            </div>

            <div *ngIf="isReadOnly(i)" class="readonly-message">
              <i class="pi pi-lock"></i>
              <span>No se puede editar (resultado firmado)</span>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <app-generic-button
            type="cancel"
            (pressed)="onCancel()">
          </app-generic-button>
          <app-generic-button
            type="save"
            [disabled]="!canSave()"
            (pressed)="onSave()">
          </app-generic-button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .edit-determinations-dialog {
      padding: 0.75rem;
      min-width: 600px;
      max-height: 75vh;
      overflow-y: auto;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .determination-row {
      padding: 0.5rem 0.75rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      background-color: #ffffff;
    }

    .determination-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .determination-header h4 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: #495057;
      flex: 1;
    }

    .badge-existing {
      padding: 0.2rem 0.4rem;
      background-color: #e3f2fd;
      color: #1976d2;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .badge-new {
      padding: 0.2rem 0.4rem;
      background-color: #e8f5e9;
      color: #388e3c;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .form-field label {
      font-weight: 500;
      color: #495057;
      font-size: 0.875rem;
    }

    .required {
      color: #ef4444;
    }

    .optional {
      color: #6b7280;
      font-size: 0.75rem;
      font-style: italic;
    }

    .readonly-message {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem;
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 3px;
      color: #856404;
      font-size: 0.8rem;
      margin-top: 0.3rem;
    }

    .readonly-message i {
      font-size: 0.9rem;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #dee2e6;
    }

    .p-error {
      color: #ef4444;
      font-size: 0.7rem;
      margin-top: 0.15rem;
    }

    .mb-3 {
      margin-bottom: 0.75rem;
    }

    .w-full {
      width: 100%;
    }
  `]
})
export class EditDeterminationsDialogComponent implements OnInit {
  form!: FormGroup;
  determinations: DeterminationDto[] = [];
  studyStatus!: StudyStatus;
  resultStatus!: ResultStatus;
  protocolCode!: string;
  analyticResultId!: string;

  // Expose enums to template
  readonly StudyStatus = StudyStatus;
  readonly ResultStatus = ResultStatus;

  /**
   * Constructor
   */
  constructor(
    private fb: FormBuilder,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    // Get data from dialog config
    this.determinations = this.config.data.determinations || [];
    this.studyStatus = this.config.data.studyStatus;
    this.resultStatus = this.config.data.resultStatus;
    this.protocolCode = this.config.data.protocolCode;
    this.analyticResultId = this.config.data.analyticResultId;

    this.initForm();
  }

  /**
   * Initialize form with determinations
   */
  private initForm() {
    this.form = this.fb.group({
      determinations: this.fb.array(
        this.determinations.map(det => this.createDeterminationGroup(det))
      )
    });
  }

  /**
   * Create form group for a determination
   */
  private createDeterminationGroup(det: DeterminationDto): FormGroup {
    const isExisting = this.isDeterminationExisting(det);
    const isReadOnly = this.isResultSigned() && isExisting;

    // Only require value for existing determinations
    const valueValidators = isExisting ? [Validators.required] : [];

    return this.fb.group({
      id: [det.id], // Entity ID from backend (for updates)
      determinationId: [det.determinationId], // Determination type ID
      name: [det.name],
      value: [
        { value: det.displayValue, disabled: isReadOnly },
        valueValidators
      ],
      observations: [
        { value: det.validationComment || '', disabled: isReadOnly }
      ],
      isExisting: [isExisting]
    });
  }

  /**
   * Check if determination exists (has a value)
   */
  private isDeterminationExisting(det: DeterminationDto): boolean {
    return det.displayValue !== null && det.displayValue !== undefined && det.displayValue !== '';
  }

  /**
   * Check if result is signed
   */
  private isResultSigned(): boolean {
    return this.resultStatus === ResultStatus.SIGNED;
  }

  /**
   * Get determinations form array
   */
  get determinationsArray(): FormArray {
    return this.form.get('determinations') as FormArray;
  }

  /**
   * Get determination name by index
   */
  getDeterminationName(index: number): string {
    return this.determinationsArray.at(index).get('name')?.value || 'Determinación';
  }

  /**
   * Check if determination is existing
   */
  isExistingDetermination(index: number): boolean {
    return this.determinationsArray.at(index).get('isExisting')?.value === true;
  }

  /**
   * Check if field should be readonly
   */
  isReadOnly(index: number): boolean {
    return this.isResultSigned() && this.isExistingDetermination(index);
  }

  /**
   * Get form control
   */
  getControl(index: number, controlName: string) {
    return this.determinationsArray.at(index).get(controlName);
  }

  /**
   * Check if form can be saved
   */
  canSave(): boolean {
    if (this.studyStatus === StudyStatus.CLOSED) {
      return false;
    }

    // Check if there are any changes
    const hasChanges = this.determinationsArray.controls.some(control => {
      const isExisting = control.get('isExisting')?.value;
      const value = control.get('value')?.value;

      // New determination with value
      if (!isExisting && value) {
        return true;
      }

      // Existing determination that is not readonly and has been modified
      if (isExisting && !this.isResultSigned() && control.dirty) {
        return true;
      }

      return false;
    });

    return hasChanges && this.form.valid;
  }

  /**
   * Handle save button click
   */
  onSave() {
    if (!this.canSave()) {
      return;
    }

    const determinationsToSave: DeterminationEditDto[] = [];

    this.determinationsArray.controls.forEach(control => {
      const id = control.get('id')?.value; // Entity ID (for updates)
      const determinationId = control.get('determinationId')?.value; // Determination type ID
      const value = control.get('value')?.value;
      const observations = control.get('observations')?.value;
      const isExisting = control.get('isExisting')?.value;

      // Include if:
      // 1. New determination with value
      // 2. Existing determination that was modified (and not readonly)
      if (
        (!isExisting && value) ||
        (isExisting && !this.isResultSigned() && control.dirty)
      ) {
        const dto: DeterminationEditDto = {
          // For existing: determinationId = entity ID (id field from backend)
          // For new: determinationId = catalog ID (determinationId field from backend)
          determinationId: isExisting ? id : determinationId,
          value: value?.toString() || '',
          isNew: !isExisting
        };

        // Add observations if present
        if (observations) {
          dto.observations = observations;
        }

        determinationsToSave.push(dto);
      }
    });

    if (determinationsToSave.length > 0) {
      this.ref.close({
        determinations: determinationsToSave,
        protocolCode: this.protocolCode,
        analyticResultId: this.analyticResultId
      });
    }
  }

  /**
   * Handle cancel button click
   */
  onCancel() {
    this.ref.close();
  }
}

