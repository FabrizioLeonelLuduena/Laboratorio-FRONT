import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { DividerModule } from 'primeng/divider';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

import { AnalysisService } from '../../../analysis-catalog/application/analysis.service';
import { Analysis } from '../../../analysis-catalog/domain/analysis.model';

/**
 * Formulario para editar un análisis existente
 * Permite editar solo los campos propios del análisis (no NBU ni Determinaciones)
 */
@Component({
  selector: 'app-analysis-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    DividerModule,
    DatePipe
  ],
  templateUrl: './analysis-edit-form.component.html',
  styleUrl: './analysis-edit-form.component.css'
})
export class AnalysisEditFormComponent implements OnInit {
  @Input() analysis!: Analysis;
  @Output() saved = new EventEmitter<Analysis>();
  @Output() cancelled = new EventEmitter<void>();

  formFields: GenericFormField[] = [];
  initialValue: any = {};
  saving = false;

  // Alert state
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';

  /**
   * Initializes component dependencies
   */
  constructor(
    private fb: FormBuilder,
    private analysisService: AnalysisService
  ) {}

  /**
   * Initializes the component and loads necessary data
   */
  ngOnInit(): void {
    this.buildFormFields();
    this.setInitialValues();
  }

  /**
   * Construye los campos del formulario
   */
  private buildFormFields(): void {
    this.formFields = [
      {
        name: 'name',
        label: 'Analysis Name',
        type: 'text',
        required: true,
        placeholder: 'Enter analysis name',
        colSpan: 2,
        hint: 'Full name of the analysis',
        messages: {
          required: 'Analysis name is required',
          minLength: 'Name must be at least 3 characters',
          maxLength: 'Name cannot exceed 200 characters'
        },
        minlength: 3,
        maxlength: 200
      },
      {
        name: 'code',
        label: 'Analysis Code',
        type: 'text',
        required: false,
        placeholder: 'Enter code (optional)',
        colSpan: 1,
        hint: 'Internal code for the analysis'
      },
      {
        name: 'shortCode',
        label: 'Short Code',
        type: 'number',
        required: false,
        placeholder: 'Enter short code',
        colSpan: 1,
        hint: 'Numeric short code'
      },
      {
        name: 'familyName',
        label: 'Family Name',
        type: 'text',
        required: false,
        placeholder: 'Enter family name',
        colSpan: 1,
        hint: 'Classification family'
      },
      {
        name: 'ub',
        label: 'UB (Unidad Bioquímica)',
        type: 'number',
        required: false,
        placeholder: 'Enter UB value',
        colSpan: 1,
        hint: 'Biochemical unit value',
        step: 0.01
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'Enter description (optional)',
        colSpan: 2,
        rows: 4,
        hint: 'Additional information about the analysis',
        maxlength: 1000
      }
    ];
  }

  /**
   * Establece los valores iniciales del formulario
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.analysis.name || '',
      code: this.analysis.code || '',
      shortCode: this.analysis.shortCode || null,
      familyName: this.analysis.familyName || '',
      ub: this.analysis.ub || null,
      description: this.analysis.description || ''
    };
  }

  /**
   * Maneja el submit del formulario
   * Envía solo los campos que fueron modificados (PATCH)
   */
  onSubmit(formData: any): void {
    this.saving = true;
    
    // Construir objeto solo con los campos modificados
    const updateDTO: any = {};
    
    if (formData.name !== this.initialValue.name) {
      updateDTO.name = formData.name;
    }
    if (formData.code !== this.initialValue.code) {
      updateDTO.code = formData.code || null;
    }
    if (formData.shortCode !== this.initialValue.shortCode) {
      updateDTO.short_code = formData.shortCode || null;
    }
    if (formData.familyName !== this.initialValue.familyName) {
      updateDTO.family_name = formData.familyName || null;
    }
    if (formData.ub !== this.initialValue.ub) {
      updateDTO.ub = formData.ub || null;
    }
    if (formData.description !== this.initialValue.description) {
      updateDTO.description = formData.description || null;
    }

    // Si no hay cambios, no hacer nada
    if (Object.keys(updateDTO).length === 0) {
      this.showAlertMessage('No changes detected', 'info');
      this.saving = false;
      return;
    }

    // Llamar al servicio con PATCH (solo campos modificados)
    this.analysisService.updateAnalysis(this.analysis.id, updateDTO).subscribe({
      next: (updatedAnalysis: Analysis) => {
        this.saving = false;
        this.showAlertMessage('Analysis updated successfully', 'success');
        
        // Esperar un momento para que se vea la alerta y luego emitir
        setTimeout(() => {
          this.saved.emit(updatedAnalysis);
        }, 1500);
      },
      error: (error: any) => {
        this.saving = false;
        
        
        const errorMessage = error.error?.message || 
                           error.message || 
                           'An error occurred while updating the analysis';
        
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Maneja la cancelación del formulario
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Muestra un mensaje de alerta
   */
  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;

    // Auto-hide después de 5 segundos
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
