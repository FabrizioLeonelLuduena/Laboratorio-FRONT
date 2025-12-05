import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { finalize } from 'rxjs';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import type { AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { AgreementResponseDTO } from '../../../../coverage-administration/models/agreement.model';
import { Patient } from '../../../../patients/models/PatientModel';
import { PatientService } from '../../../../patients/services/PatientService';
import { PatientEditModalComponent } from '../../patient-edit-modal/patient-edit-modal.component';

/**
 * Extended Patient interface for modal usage with flat email/phone properties
 */
interface PatientForModal extends Patient {
  email?: string;
  phone?: string;
}

/**
 * Component for managing patient general data in care management workflow.
 */
@Component({
  selector: 'app-patient-general-data',
  imports: [
    CommonModule,
    FormsModule,
    InputNumber,
    Select,
    InputTextModule,
    PatientEditModalComponent,
    GenericAlertComponent,
    GenericButtonComponent
  ],
  templateUrl: './patient-general-data.component.html',
  styleUrl: './patient-general-data.component.css'
})
export class PatientGeneralDataComponent implements OnInit {

  @Input() patientDni: number | null = null;
  @Output() loading: EventEmitter<boolean> = new EventEmitter();

  patient!: Patient;
  coverages?: AgreementResponseDTO[];

  selectedCoverageId: number | null | undefined;
  coverageOptions: Array<{ label: string; value: number }> = [];

  /** Alert state */
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /** Patient formatted for modal (with flat email/phone) */
  patientForModal!: PatientForModal;

  /**
   * Component constructor.
   * Injects required services for retrieving patient data.
   *
   * @param patientService Service responsible for fetching and managing patient data from the backend.
   */
  constructor(
      private patientService: PatientService
  ) {}

  /**
   * Angular lifecycle hook executed when the component initializes.
   * If a `patientDni` value is provided, automatically fetches the corresponding patient data.
   */
  ngOnInit(): void {
    if (this.patientDni) {
      this.getPatient(this.patientDni);
    }
  }

  /**
   * Gets a patient and transforms it for modal usage
   */
  private getPatient(dni: number) {

    this.patientService.findByDNI(dni)
      .pipe(finalize(() => this.loading.emit(false)))
      .subscribe({
        next: (rawPatientOrArray) => {
          const rawPatient = Array.isArray(rawPatientOrArray) ? rawPatientOrArray[0] : rawPatientOrArray;

          this.patient = this.mapPatientResponseToPatient(rawPatient);
          this.patientDni = dni;
          this.patientForModal = this.transformPatientForModal(this.patient);

          this.coverageOptions = (this.patient.coverages ?? []).map(cov => ({
            label: `${cov.insurerAcronym} - ${cov.planAcronym} (${cov.planName})`,
            value: cov.planId
          }));

          const primary = this.patient.coverages?.find(c => c.isPrimary);
          this.selectedCoverageId = primary ? primary.planId : undefined;

          if (!this.patient.coverages?.length) {
            this.coverageOptions = [];
            this.selectedCoverageId = undefined;
          }
        },
        error: (err) => {

          this.loading.emit(false);
          const detail = err?.error?.message || 'No se pudo encontrar el paciente.';
          this.showAlert('error', 'Error al buscar paciente', `${detail} Documento: ${dni}`);
        }
      });
  }


  /**
   * Transforms a Patient object to include flat email/phone properties
   */
  private transformPatientForModal(patient: Patient): PatientForModal {
    // Extract email and phone from contacts array
    const emailContact = patient.contacts?.find(
      (c: any) => c.contactType === 'EMAIL' || c.contactType === 'email'
    );

    const phoneContact = patient.contacts?.find(
      (c: any) => c.contactType === 'PHONE' || c.contactType === 'TELEFONO' || c.contactType === 'phone'
    );

    return {
      ...patient,
      email: emailContact?.contactValue || '',
      phone: phoneContact?.contactValue || ''
    };
  }

  /**
   * Maps and normalizes a raw API response into the internal frontend patient model.
   * Ensures that the birth date format is standardized to `yyyy-MM-dd`,
   * supporting various input formats (ISO, `dd-MM-yyyy`, `dd/MM/yyyy`).
   *
   * @param response Raw patient response object received from the backend API.
   * @returns A normalized patient object ready for frontend use, or `null` if the response is invalid.
   *
   * @example
   * ```ts
   * const mapped = this.mapPatientResponseToPatient(apiResponse);
   * console.log(mapped.birthDate); // "1990-05-10"
   * ```
   */
  mapPatientResponseToPatient(response: any): any {
    if (!response) return null;

    // Normalizar fecha de nacimiento a yyyy-MM-dd
    // Acepta entradas en dd-MM-yyyy, dd/MM/yyyy o yyyy-MM-dd (la deja igual)
    const normalizeBirthDate = (dateStr: string): string => {
      if (!dateStr) return '';
      // ya en formato ISO corto
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // dd-MM-yyyy
      let m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      // dd/MM/yyyy
      m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      // Intento de parseo genérico
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      // Si no se pudo normalizar, devolver cadena original (evita romper flujos)
      return dateStr;
    };

    return {
      id: response.id,
      dni: response.dni,
      firstName: response.firstName,
      lastName: response.lastName,
      birthDate: normalizeBirthDate(response.birthDate),
      gender: response.gender,
      sexAtBirth: response.sexAtBirth,
      isVerified: true, // Campo interno del front
      isActive: response.isActive,
      hasGuardian: response.hasGuardian,
      guardians: response.guardians ?? [],
      addresses: response.addresses ?? [],
      contacts: response.contacts ?? [],
      coverages: response.coverages ?? [],
      status: response.status
    };
  }

  /**
   * Display an alert message with auto-hide after 5 seconds
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }

  patientModalVisible = false;
  patientModalReadOnly = false;

  /**
   * Opens the patient modal and refreshes patient data
   */
  openPatientModal(readOnly: boolean = false): void {
    // Refresh patient data before opening modal
    if (this.patient) {
      this.patientForModal = this.transformPatientForModal(this.patient);
    }

    this.patientModalReadOnly = readOnly;
    this.patientModalVisible = true;
  }

  /**
   * Handles patient update from modal
   */
  onPatientUpdated(updatedPatient: Patient): void {
    this.patient = updatedPatient;
    this.patientForModal = this.transformPatientForModal(updatedPatient);

    // Refrescar formulario y datos dependientes
    // this.cdr.detectChanges();

    // Si querés, recargar datos de atención que dependan del paciente
    if (this.patient?.dni) {
      this.getPatient(Number(this.patient.dni));
    }
  }


  /**
   * Returns the selected Member Number
   */
  get selectedMemberNumber(): string | undefined {
    const selected = this.patient?.coverages?.find(c => c.planId === this.selectedCoverageId);
    return selected?.memberNumber;
  }


}
