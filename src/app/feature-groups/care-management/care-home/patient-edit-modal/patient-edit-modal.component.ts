import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import type { AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';

import { Patient } from '../../../patients/models/PatientModel';
import { PatientService } from '../../../patients/services/PatientService';

/**
 * A modal component used to edit or view patient details.
 */
@Component({
  selector: 'app-patient-edit-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    GenericModalComponent,
    GenericFormComponent,
    CommonModule
  ],
  providers: [],
  templateUrl: './patient-edit-modal.component.html',
  styleUrls: ['./patient-edit-modal.component.css']
})
export class PatientEditModalComponent implements OnInit, OnChanges {
  @Input() patient!: Patient;
  @Input() visible = false;
  @Input() readOnly = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() patientUpdated = new EventEmitter<Patient>();

  formFields: GenericFormField[] = [];
  initialFormValue: any = {};

  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /**
   * Creates an instance of PatientEditModalComponent.
  /**
   * @param patientService - Service for patient CRUD operations
   * @param cdr - Angular change detector for manual change detection triggers
   */
  constructor(
    private patientService: PatientService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Angular lifecycle hook called after component initialization.
   *
   * Performs initial setup:
   * 1. Builds the form field configuration
   * 2. Loads patient data if available
   *
   * This method runs once when the component is first created.
   */
  ngOnInit(): void {
    this.buildFields();
    if (this.patient) {
      this.loadPatientData();
    }
  }

  /**
   * Angular lifecycle hook called when any data-bound input property changes.
   *
   * Handles three scenarios:
   * 1. **Patient or readOnly changes**: Rebuilds form fields and reloads data
   * 2. **Modal opens (visible becomes true)**: Refreshes form with latest patient data
   * 3. **Other changes**: No action taken
   *
   * This ensures the form always displays current data when opened and
   * updates field configurations when the mode changes.
   *
   * @param changes - Object containing the changed properties with their previous and current values
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient'] || changes['readOnly']) {
      this.buildFields();
      if (this.patient) {
        this.loadPatientData();
      }
    }

    // Cuando se abre el modal, recargar datos frescos
    if (changes['visible'] && changes['visible'].currentValue === true && this.patient) {
      this.buildFields();
      this.loadPatientData();
    }
  }

  /**
   * Construye los campos del formulario según el estado readOnly
   */
  private buildFields(): void {
    this.formFields = [
      {
        name: 'dni',
        label: 'DNI',
        type: 'text',
        required: true,
        disabled: true  // DNI siempre deshabilitado
      },
      {
        name: 'lastName',
        label: 'Apellido',
        type: 'text',
        required: true,
        disabled: this.readOnly
      },
      {
        name: 'firstName',
        label: 'Nombre',
        type: 'text',
        required: true,
        disabled: this.readOnly
      },
      {
        name: 'birthDate',
        label: 'Fecha de nacimiento',
        type: 'date',
        required: true,
        disabled: this.readOnly
      },
      {
        name: 'sexAtBirth',
        label: 'Sexo al nacer',
        type: 'select',
        required: true,
        disabled: this.readOnly,
        options: [
          { label: 'Masculino', value: 'MALE' },
          { label: 'Femenino', value: 'FEMALE' }
        ]
      },
      {
        name: 'gender',
        label: 'Género',
        type: 'select',
        required: true,
        disabled: this.readOnly,
        options: [
          { label: 'Masculino', value: 'MALE' },
          { label: 'Femenino', value: 'FEMALE' },
          { label: 'Otro', value: 'OTHER' }
        ]
      },
      {
        name: 'phone',
        label: 'Teléfono',
        type: 'text',
        required: true,
        disabled: this.readOnly
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        disabled: this.readOnly
      }
    ];
  }

  /**
   * Carga los datos del paciente en el formulario
   */
  private loadPatientData(): void {
    if (!this.patient) return;

    // Normalizar la fecha a medianoche en la zona horaria local
    const birthDate = this.patient.birthDate ? this.parseDateSafe(this.patient.birthDate) : null;

    // Buscar email y teléfono en los contactos
    const emailContact = this.patient.contacts?.find(
      (c: any) => c.contactType === 'EMAIL' || c.contactType === 'email'
    );

    const phoneContact = this.patient.contacts?.find(
      (c: any) => c.contactType === 'PHONE' || c.contactType === 'TELEFONO' || c.contactType === 'phone'
    );

    this.initialFormValue = {
      dni: this.patient.dni,
      firstName: this.patient.firstName,
      lastName: this.patient.lastName,
      birthDate,
      sexAtBirth: this.patient.sexAtBirth,
      gender: this.patient.gender,
      email: emailContact?.contactValue ?? '',
      phone: phoneContact?.contactValue ?? ''
    };

    // Forzar detección de cambios para actualizar la vista
    this.cdr.detectChanges();
  }

  /**
   * Parsea una fecha de forma segura evitando problemas de zona horaria.
   * Si la fecha viene en formato ISO (YYYY-MM-DD), la trata como fecha local.
   */
  private parseDateSafe(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    }

    // Si es string en formato ISO (YYYY-MM-DD), parsearlo como fecha local
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof dateInput === 'string' && isoDatePattern.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    // Para otros formatos, usar el constructor normal y normalizar
    const date = new Date(dateInput);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Cierra el modal y resetea el formulario
   */
  closeModal(): void {

    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(formData: any): void {
    const updatedPatient: Patient = {
      ...this.patient,
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      sexAtBirth: formData.sexAtBirth,
      gender: formData.gender,
      contacts: [
        {
          contactType: 'EMAIL',
          contactValue: formData.email,
          isPrimary: true
        },
        {
          contactType: 'PHONE',
          contactValue: formData.phone,
          isPrimary: true
        }
      ]
    };

    this.patientService.updatePatient(this.patient.id, updatedPatient).subscribe({
      next: () => {
        this.showAlert('success', 'Éxito', 'Paciente actualizado correctamente');
        this.patientUpdated.emit(updatedPatient);
        this.closeModal();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo actualizar el paciente');
      }
    });
  }

  /**
   * Display an inline alert message inside the modal.
   *
   * Sets the alert type, title and text and triggers change detection so the
   * UI updates immediately. The alert is automatically cleared after 5 seconds.
   *
   * @param type - Semantic alert type: 'success' | 'error' | 'warning' | 'info'
   * @param title - Short title displayed in the alert header
   * @param text - Detailed message shown in the alert body
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.alertType = null;
      this.cdr.markForCheck();
    }, 5000);
  }
}
