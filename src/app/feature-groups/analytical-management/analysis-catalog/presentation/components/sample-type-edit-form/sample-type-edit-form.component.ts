import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';

import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { SampleTypeService } from '../../../application/sample-type.service';
import { SampleType } from '../../../domain/sample-type.model';

/**
 * Form component for creating or editing a SampleType
 */
@Component({
  selector: 'app-sample-type-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    GenericFormComponent,
    GenericAlertComponent
  ],
  templateUrl: './sample-type-edit-form.component.html',
  styleUrl: './sample-type-edit-form.component.css'
})
export class SampleTypeEditFormComponent implements OnInit {
  private sampleTypeService = inject(SampleTypeService);

  @Input() sampleType: SampleType | null = null;
  @Output() save = new EventEmitter<SampleType>();
  @Output() cancelled = new EventEmitter<void>();

  formFields = signal<GenericFormField[]>([]);
  initialValue: any = {};
  saving = signal<boolean>(false);

  // Alert state
  showAlert = signal<boolean>(false);
  alertType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  alertTitle = signal<string>('');
  alertText = signal<string>('');

  /**
   * Initializes the component and loads necessary data
   */
  ngOnInit(): void {
    this.buildFormFields();
    this.setInitialValues();
  }

  /**
   * Builds the form field configuration
   */
  private buildFormFields(): void {
    this.formFields.set([
      {
        name: 'name',
        label: 'Nombre',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el nombre del tipo de muestra',
        colSpan: 1,
        hint: 'Campo obligatorio',
        messages: {
          required: 'El nombre es obligatorio',
          minLength: 'El nombre debe tener al menos 3 caracteres',
          maxLength: 'El nombre debe tener menos de 255 caracteres'
        }
      }
    ]);
  }

  /**
   * Sets the initial form values
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.sampleType?.name || ''
    };
  }

  /**
   * Handles form submission
   */
  onSubmit(formData: any): void {
    this.saving.set(true);

    const isNew = !this.sampleType?.id;
    
    // Construir objeto SampleType completo - el mapper y servicio se encargan de la transformación
    const sampleTypeToSave: SampleType = {
      id: this.sampleType?.id || 0,
      name: formData.name,
      entityVersion: this.sampleType?.entityVersion,
      createdDatetime: this.sampleType?.createdDatetime,
      lastUpdatedDatetime: this.sampleType?.lastUpdatedDatetime,
      createdUser: this.sampleType?.createdUser,
      lastUpdatedUser: this.sampleType?.lastUpdatedUser
    };

    this.sampleTypeService.createOrUpdateSampleType(sampleTypeToSave).subscribe({
      next: (result: SampleType) => {
        this.saving.set(false);
        const message = isNew
          ? 'Tipo de muestra creado exitosamente'
          : 'Tipo de muestra actualizado exitosamente';

        this.displayAlert('success', '¡Éxito!', message);

        setTimeout(() => {
          this.save.emit(result);
        }, 1500);
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al guardar el tipo de muestra');
        this.displayAlert('error', 'Error', errorMessage);
      }
    });
  }

  /**
   * Handles form cancellation
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Displays an alert message
   */
  private displayAlert(type: 'success' | 'error' | 'warning' | 'info', title: string, text: string): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    setTimeout(() => {
      this.showAlert.set(false);
    }, 4500);
  }
}
