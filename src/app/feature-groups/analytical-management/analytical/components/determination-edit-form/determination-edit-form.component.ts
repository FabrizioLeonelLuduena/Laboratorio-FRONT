import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

import { DeterminationService } from '../../../analysis-catalog/application/determination.service';
import { Determination } from '../../../analysis-catalog/domain/determination.model';

/**
 * Formulario para editar una Determinación existente
 */
@Component({
  selector: 'app-determination-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    TagModule,
    DatePipe
  ],
  templateUrl: './determination-edit-form.component.html',
  styleUrl: './determination-edit-form.component.css'
})
export class DeterminationEditFormComponent implements OnInit {
  @Input() determination!: Determination;
  @Output() saved = new EventEmitter<Determination>();
  @Output() cancelled = new EventEmitter<void>();

  formFields: GenericFormField[] = [];
  initialValue: any = {};
  saving = false;
  
  // Alert state
  showAlert = false;
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  alertTitle = '';
  alertText = '';

  /**
   * Initializes component dependencies
   */
  constructor(
    private fb: FormBuilder,
    private determinationService: DeterminationService
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
   * NOTA: Solo incluimos los campos básicos que existen en la interfaz Determination
   */
  private buildFormFields(): void {
    this.formFields = [
      {
        name: 'name',
        label: 'Determination Name',
        type: 'text',
        required: true,
        placeholder: 'Enter determination name',
        colSpan: 2,
        hint: 'Required field',
        messages: {
          required: 'Determination name is required',
          minLength: 'Name must be at least 3 characters',
          maxLength: 'Name must be less than 255 characters'
        }
      },
      {
        name: 'percentageVariationTolerated',
        label: 'Percentage Variation Tolerated',
        type: 'number',
        required: false,
        placeholder: 'Enter percentage (optional)',
        colSpan: 2,
        hint: 'Acceptable variation percentage'
      }
    ];
  }

  /**
   * Establece los valores iniciales del formulario
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.determination.name || '',
      percentageVariationTolerated: this.determination.percentageVariationTolerated || null
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
    if (formData.percentageVariationTolerated !== this.initialValue.percentageVariationTolerated) {
      updateDTO.percentage_variation_tolerated = formData.percentageVariationTolerated || null;
    }

    // Si no hay cambios, no hacer nada
    if (Object.keys(updateDTO).length === 0) {
      this.displayAlert('info', 'No changes', 'No changes detected');
      this.saving = false;
      return;
    }

    // Llamar al servicio con PATCH (solo campos modificados)
    this.determinationService.updateDetermination(this.determination.id, updateDTO).subscribe({
      next: (updatedDetermination: Determination) => {
        this.saving = false;
        this.displayAlert('success', 'Success!', 'Determination updated successfully');
        
        setTimeout(() => {
          this.saved.emit(updatedDetermination);
        }, 1500);
      },
      error: (error: any) => {
        this.saving = false;
        
        
        const errorMessage = error.error?.message || 
                           error.message || 
                           'An error occurred while updating the determination';
        
        this.displayAlert('error', 'Error', errorMessage);
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
   * Muestra una alerta
   */
  private displayAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    text: string
  ): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
