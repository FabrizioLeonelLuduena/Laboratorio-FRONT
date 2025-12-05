import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';

import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { WorksheetSettingService } from '../../../application/worksheet-setting.service';
import { WorksheetSetting } from '../../../domain/worksheet-setting.model';

/**
 * Form component for creating or editing a WorksheetSetting
 */
@Component({
  selector: 'app-worksheet-setting-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    GenericFormComponent,
    GenericAlertComponent
  ],
  templateUrl: './worksheet-setting-edit-form.component.html',
  styleUrl: './worksheet-setting-edit-form.component.css'
})
export class WorksheetSettingEditFormComponent implements OnInit {
  private worksheetSettingService = inject(WorksheetSettingService);

  @Input() worksheetSetting: WorksheetSetting | null = null;
  @Output() save = new EventEmitter<WorksheetSetting>();
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
        placeholder: 'Ingrese el nombre de la configuración',
        colSpan: 1,
        hint: 'Campo obligatorio',
        messages: {
          required: 'El nombre es obligatorio',
          minLength: 'El nombre debe tener al menos 3 caracteres',
          maxLength: 'El nombre debe tener menos de 255 caracteres'
        }
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        required: false,
        placeholder: 'Ingrese una descripción (opcional)',
        colSpan: 1,
        hint: 'Campo opcional'
      }
    ]);
  }

  /**
   * Sets the initial form values
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.worksheetSetting?.name || '',
      description: this.worksheetSetting?.description || ''
    };
  }

  /**
   * Handles form submission
   */
  onSubmit(formData: any): void {
    this.saving.set(true);

    const isNew = !this.worksheetSetting?.id;
    
    // Construir objeto WorksheetSetting completo - el mapper y servicio se encargan de la transformación
    const worksheetSettingToSave: WorksheetSetting = {
      id: this.worksheetSetting?.id || 0,
      name: formData.name,
      description: formData.description || '',
      entityVersion: this.worksheetSetting?.entityVersion,
      createdDatetime: this.worksheetSetting?.createdDatetime,
      lastUpdatedDatetime: this.worksheetSetting?.lastUpdatedDatetime,
      createdUser: this.worksheetSetting?.createdUser,
      lastUpdatedUser: this.worksheetSetting?.lastUpdatedUser,
      workSectionId: this.worksheetSetting?.workSectionId
    };

    this.worksheetSettingService.createOrUpdateWorksheetSetting(worksheetSettingToSave).subscribe({
      next: (result: WorksheetSetting) => {
        this.saving.set(false);
        const message = isNew
          ? 'Configuración creada exitosamente'
          : 'Configuración actualizada exitosamente';

        this.displayAlert('success', '¡Éxito!', message);

        setTimeout(() => {
          this.save.emit(result);
        }, 1500);
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al guardar la configuración de hoja');
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
