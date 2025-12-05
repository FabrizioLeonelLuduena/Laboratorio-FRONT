import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';

import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';

import { GenericAlertComponent, AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericDynamicFormComponent, DynamicFormField } from '../../../../../shared/components/generic-dynamic-form/generic-dynamic-form.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { DoctorResponse, DoctorRequest, Gender } from '../../../models/doctors.model';
import { DoctorFilter, DoctorService } from '../../../services/doctor.service';

/**
 * Component for autocompleting and selecting doctors
 */
@Component({
  selector: 'app-doctor-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AutoCompleteModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericDynamicFormComponent,
    GenericModalComponent
  ],
  templateUrl: './doctor-autocomplete.component.html',
  styleUrls: ['./doctor-autocomplete.component.css']
})
export class DoctorAutocompleteComponent implements OnInit {
  private readonly doctorService = inject(DoctorService);

  /** Input: label for the field */
  @Input() label: string = 'Médico';

  /** Input: placeholder text */
  @Input() placeholder: string = 'Buscar médico por nombre o matrícula...';

  /** Input: whether the field is required */
  @Input() required: boolean = true;

  /** Output: emits the selected doctor ID */
  @Output() doctorSelected = new EventEmitter<number>();

  /** Output: emits the selected doctor object */
  @Output() doctorObjectSelected = new EventEmitter<DoctorResponse>();

  /** Form control for the autocomplete input */
  doctorCtrl = new FormControl<DoctorResponse | null>(null);

  /** List of filtered doctors for autocomplete suggestions */
  filteredDoctors: DoctorResponse[] = [];

  /** All available doctors */
  allDoctors: DoctorResponse[] = [];

  /** Loading state */
  loading = false;

  /** Modal state */
  showCreateModal = false;
  saving = false;

  /** Options for registration/tuition types loaded from API */
  registrationTypeOptions: Array<{ label: string; value: string }> = [];

  /** Alert state */
  showAlert = false;
  alertType: AlertType = 'info';
  alertTitle = '';
  alertText = '';

  /**
   * Converts an uppercase code to a capitalized Spanish label.
   * The original value is maintained for POST requests.
   */
  private toDisplayLabel(code: string): string {
    if (!code) return '';
    const map: Record<string, string> = {
      PROVINCE: 'provincia',
      PROVINCIAL: 'provincial',
      SPECIALIST: 'especialista',
      NATIONAL: 'nacional',
      PUBLIC: 'pública',
      PRIVATE: 'privada',
      FEDERAL: 'federal',
      STATE: 'estatal',
      MUNICIPAL: 'municipal'
    };
    const normalized = code.replace(/[_-]+/g, ' ').trim().toUpperCase();
    const direct = map[normalized];
    const base = direct ?? normalized.toLowerCase();
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /** Form fields for creating a new doctor (aligned with DoctorHomeComponent) */
  formFields: DynamicFormField[] = [
    {
      name: 'lastName',
      label: 'Apellido',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^.{2,100}$',
      placeholder: 'Apellido'
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^.{2,100}$',
      placeholder: 'Nombre'
    },
    {
      name: 'tuitionType',
      label: 'Tipo de Matrícula',
      type: 'select',
      required: true,
      colSpan: 1,
      options: []
    },
    {
      name: 'tuitionNumber',
      label: 'Matrícula',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^\\d{4,12}$',
      placeholder: 'Número de matrícula'
    },
    {
      name: 'email',
      label: 'Correo',
      type: 'email',
      required: false,
      colSpan: 1,
      placeholder: 'ejemplo@correo.com'
    },
    {
      name: 'gender',
      label: 'Género',
      type: 'radio',
      required: true,
      colSpan: 1,
      options: [
        { label: 'Masculino', value: 'MALE' },
        { label: 'Femenino', value: 'FEMALE' }
      ]
    },
    {
      name: 'observations',
      label: 'Observaciones',
      type: 'textarea',
      required: false,
      colSpan: 2,
      placeholder: 'Observaciones adicionales'
    }
  ];

  initialValue: Record<string, any> = {
    name: '',
    lastName: '',
    email: '',
    gender: 'MALE' as Gender,
    tuitionType: '',
    tuitionNumber: '',
    observations: ''
  };

  /**
   * Initialize all doctors.
   */
  ngOnInit(): void {
    this.loadAllDoctors();
    this.loadRegistrationTypes();
  }

  /** Load registration types from the service */
  private loadRegistrationTypes(): void {
    this.doctorService.getRegistrationTypes().subscribe({
      next: (types) => {
        this.registrationTypeOptions = (types || []).map(t => ({ label: this.toDisplayLabel(t), value: t }));
        const tuitionField = this.formFields.find(f => f.name === 'tuitionType');
        if (tuitionField) {
          tuitionField.options = this.registrationTypeOptions;
        }
      },
      error: () => {
        // Keep options empty on error
      }
    });
  }

  /**
   * Format doctor's title as "LastName, FirstName"
   */
  private formatTitle(doctor: any): string {
    const last = doctor.lastName ? doctor.lastName.trim() : '';
    const first = doctor.name ? doctor.name.trim() : '';
    return (last ? `${last}, ` : '') + first;
  }

  /**
   * Load all doctors from the service
   */
  private loadAllDoctors(): void {
    this.loading = true;

    const filter: DoctorFilter = {
      status: 'ACTIVE',
      page: 0,
      size: 10,
      sortField: 'id',
      sortOrder: 1
    };

    this.doctorService.list(filter).subscribe({
      next: (response) => {
        const content = response?.content ?? [];
        this.allDoctors = content.map(d => ({
          id: d.id ?? 0,
          name: d.name ?? '',
          lastName: d.lastName ?? '',
          tuition: d.tuition ?? '',
          registration: d.registration,
          registrationType: d.registrationType,
          email: d.email ?? '',
          status: d.status ?? 'ACTIVE',
          gender: d.gender,
          title: this.formatTitle(d)
        })) as DoctorResponse[];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.allDoctors = [];
      }
    });
  }

  /** Filtro para autocompletado (busca en el backend) */
  filterDoctors(event: AutoCompleteCompleteEvent): void {
    const query = (event.query || '').trim();
    if (!query || query.length < 3) {
      this.filteredDoctors = [];
      return;
    }

    this.loading = true;

    const filter: DoctorFilter = {
      search: query,
      status: 'ACTIVE',
      page: 0,
      size: 50,
      sortField: 'id',
      sortOrder: 1
    };

    this.doctorService.list(filter).subscribe({
      next: (response) => {
        const queryLower = query.toLowerCase();
        this.filteredDoctors = (response.content || [])
          .filter(doctor =>
            doctor.name.toLowerCase().includes(queryLower) ||
            (doctor.tuition && doctor.tuition.toLowerCase().includes(queryLower))
          )
          .map(doctor => ({
            id: doctor.id ?? 0,
            name: doctor.name,
            lastName: doctor.lastName,
            tuition: doctor.tuition || '',
            email: doctor.email,
            status: doctor.status ?? 'ACTIVE',
            gender: doctor.gender,
            title: ''
          })) as DoctorResponse[];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.filteredDoctors = [];
      }
    });
  }

  /**
   * Handle doctor selection
   */
  onDoctorSelect(event: AutoCompleteSelectEvent): void {
    const selectedDoctor = event.value as DoctorResponse;
    if (selectedDoctor && selectedDoctor.id) {
      this.doctorSelected.emit(selectedDoctor.id);
      this.doctorObjectSelected.emit(selectedDoctor);
    }
  }

  /**
   * Get the selected doctor ID
   */
  getSelectedDoctorId(): number | null {
    const val = this.doctorCtrl.value;
    return val?.id ?? null;
  }

  /**
   * Get the selected doctor object
   */
  getSelectedDoctor(): DoctorResponse | null {
    return this.doctorCtrl.value;
  }

  /**
   * Reset the selection
   */
  reset(): void {
    this.doctorCtrl.reset();
  }

  /**
   * Set a doctor as selected
   */
  setSelectedDoctor(doctor: DoctorResponse): void {
    this.doctorCtrl.setValue(doctor);
  }

  /**
   * Handle create doctor button click
   */
  onCreateDoctor(): void {
    this.initialValue = {
      name: '',
      lastName: '',
      email: '',
      gender: 'MALE' as Gender,
      tuitionType: '',
      tuitionNumber: '',
      observations: ''
    };
    this.showCreateModal = true;
  }

  /**
   * Close the create doctor modal
   */
  closeModal(): void {
    this.showCreateModal = false;
    this.saving = false;
  }

  /**
   * Display an alert message
   */
  private displayAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.showAlert = true;
  }

  /**
   * Dismiss the alert
   */
  dismissAlert(): void {
    this.showAlert = false;
  }

  /**
   * Handle new doctor form submission
   */
  onSubmitNewDoctor(formValue: Record<string, any>): void {
    if (this.saving) {
      return;
    }
    this.saving = true;

    const lastName = (formValue['lastName'] ?? '').trim();
    const cleanName = (formValue['name'] ?? '').trim().replace(/^(Dr\.|Dra\.)\s*/i, '');
    const type = (formValue['tuitionType'] ?? '').trim();
    const number = (formValue['tuitionNumber'] ?? '').trim();
    const gender = (formValue['gender'] ?? 'MALE') as Gender;
    const observations = formValue['observations']?.trim() || undefined;

    const body: DoctorRequest = {
      name: cleanName,
      lastName: lastName || undefined,
      tuition: number,
      registration: type ? type.toUpperCase() : undefined,
      email: formValue['email']?.trim() || undefined,
      gender,
      observations
    };

    this.doctorService.createDoctor(body).subscribe({
      next: (id: number) => {
        this.saving = false;
        this.showCreateModal = false;

        const newDoctor: DoctorResponse = {
          id,
          name: body.name || cleanName,
          lastName: body.lastName || lastName, tuition: body.tuition || number,
          registration: body.registration,
          registrationType: type,
          email: body.email,
          status: 'ACTIVE',
          gender: body.gender || gender,
          title: ''
        };

        newDoctor.title = this.formatTitle(newDoctor);

        this.allDoctors.push(newDoctor);
        this.filteredDoctors = [newDoctor];

        this.doctorCtrl.setValue(newDoctor);
        this.doctorCtrl.updateValueAndValidity();

        this.doctorSelected.emit(id);
        this.doctorObjectSelected.emit(newDoctor);
      },
      error: (err) => {
        this.saving = false;

        if (err?.status === 409) {

          const filter: DoctorFilter = {
            search: number,
            status: 'ACTIVE',
            page: 0,
            size: 10,
            sortField: 'id',
            sortOrder: 1
          };

          this.doctorService.list(filter).subscribe({
            next: (resp) => {
              const existing = (resp.content || []).find(
                d =>
                  d.tuition === number &&
                  (!type || (d.registration && d.registration.toUpperCase() === type.toUpperCase()))
              );

              if (existing && existing.id) {
                const mapped: DoctorResponse = {
                  id: existing.id,
                  name: existing.name ?? cleanName,
                  lastName: existing.lastName ?? lastName,
                  tuition: existing.tuition ?? number,
                  registration: existing.registration,
                  registrationType: existing.registrationType ?? type,
                  email: existing.email ?? body.email,
                  status: existing.status ?? 'ACTIVE',
                  gender: existing.gender ?? gender,
                  title: this.formatTitle(existing)
                };

                this.showCreateModal = false;

                this.allDoctors.push(mapped);
                this.filteredDoctors = [mapped];

                this.doctorCtrl.setValue(mapped);
                this.doctorCtrl.updateValueAndValidity();

                this.doctorSelected.emit(mapped.id);
                this.doctorObjectSelected.emit(mapped);
              } else {
                this.displayAlert('warning', 'Médico no encontrado', `No se encontró médico existente para la matrícula: ${number}`);
              }
            },
            error: () => {
              this.displayAlert('error', 'Error de búsqueda', 'Error buscando médico existente.');
            }
          });
        } else {
          this.displayAlert('error', 'Error al crear', 'Error creando médico');
        }
      }
    });
  }
}
