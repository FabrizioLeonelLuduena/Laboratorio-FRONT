import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from '../../../../shared/components/generic-form/generic-form.component';
import { AnalysisBasicDTO } from '../../../analytical-management/analytical/models/worksheet/worksheet-form.interface';
import { BranchService } from '../../../care-management/services/branch.service';
import { CreateAppointmentRequest } from '../../models/create-appointment.model';
import { AppointmentConfigurationService } from '../../services/appointment-configuration.service';
import { AppointmentService } from '../../services/appointment.service';


/**
 * Component for creating a new appointment through a modal dialog.
 * Handles branch selection, available time slots, and appointment creation.
 */
@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, GenericFormComponent, ButtonModule, CarouselModule, GenericAlertComponent],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent implements OnInit, AfterViewInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);
  private readonly branchService = inject(BranchService);
  private readonly appointmentConfigService = inject(AppointmentConfigurationService);
  private readonly appointmentService = inject(AppointmentService);

  @ViewChild(GenericFormComponent) genericForm!: GenericFormComponent;

  patientId!: number;
  formFields: GenericFormField[] = [];
  initialFormValues: Record<string, any> = {};
  isSaving = false;
  loadingSlots = false;
  availableSlots: any[] = [];
  currentBranchId: number | null = null;
  selectedSlotId: string | null = null;
  errorMessage = '';
  fromDate = '';
  toDate = '';
  showAlert = false;
  alertType: AlertType = 'info';
  alertTitle = '';
  alertMessage = '';

  /**
   * Initializes the component and loads patient ID from dialog configuration.
   * Closes the dialog if no patient ID is provided.
   */
  ngOnInit(): void {
    this.patientId = this.dialogConfig.data?.patientId;

    if (!this.patientId) {
      this.dialogRef.close({ success: false });
      return;
    }

    this.initializeDateRange();
    this.loadFormData();
  }

  /**
   * Sets up branch selection change listener after view initialization.
   * Loads available slots when a branch is selected.
   */
  ngAfterViewInit(): void {
    Promise.resolve().then(() => {
      if (this.genericForm?.form) {
        this.genericForm.form.get('branchId')?.valueChanges
          .pipe(debounceTime(300), distinctUntilChanged())
          .subscribe((branchId) => {
            if (branchId && branchId !== this.currentBranchId) {
              this.loadSlotsForBranch(branchId);
            }
          });

        this.genericForm.form.get('fromDate')?.valueChanges
          .pipe(debounceTime(300), distinctUntilChanged())
          .subscribe((fromDate) => {
            if (fromDate) {
              this.fromDate = this.convertToDateString(fromDate);
              if (this.currentBranchId) {
                this.loadSlotsForBranch(this.currentBranchId);
              }
            }
          });

        this.genericForm.form.get('toDate')?.valueChanges
          .pipe(debounceTime(300), distinctUntilChanged())
          .subscribe((toDate) => {
            if (toDate) {
              this.toDate = this.convertToDateString(toDate);
              if (this.currentBranchId) {
                this.loadSlotsForBranch(this.currentBranchId);
              }
            }
          });
      }
    });
  }

  /**
   * Initializes the date range for slot search.
   * Sets fromDate to today + 2 days and toDate to today + 16 days.
   */
  private initializeDateRange(): void {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() + 2);
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 16);

    this.fromDate = fromDate.toISOString().slice(0, 10);
    this.toDate = toDate.toISOString().slice(0, 10);
  }

  /**
   * Converts a Date object or date string to yyyy-MM-dd format.
   * @param date Date object or string to convert
   * @returns Date string in yyyy-MM-dd format
   */
  private convertToDateString(date: Date | string): string {
    if (!date) return '';

    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return date;
      return parsedDate.toISOString().slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  /**
   * Loads form data including branches and determinations.
   * Fetches active branches from the backend and uses mock data for determinations.
   */
  loadFormData(): void {
    this.branchService.getAllBranches({ estado: 'ACTIVE' }, 0, 100, 'description,asc').subscribe({
      next: (response) => {
        const branches = response.content || [];

        const mockDeterminations: any = [
          { id: 10, name: 'Hemograma Completo' },
          { id: 11, name: 'Glucemia en Ayunas' },
          { id: 12, name: 'Perfil Lipídico' },
          { id: 13, name: 'Urea y Creatinina' }
        ];

        this.buildFormFields(branches, mockDeterminations);
      },
      error: () => {
        this.errorMessage = 'Error al cargar las sucursales. Intente nuevamente.';
        this.buildFormFields([], []);
      }
    });
  }

  /**
   * Builds form field configuration for the generic form component.
   * @param branches Array of available branches
   * @param determinations Array of available laboratory determinations
   */
  private buildFormFields(branches: any[], determinations: AnalysisBasicDTO[]): void {
    this.formFields = [
      {
        name: 'branchId',
        label: 'Sucursal',
        type: 'select',
        required: true,
        placeholder: 'Seleccione una sucursal',
        options: branches.map(b => ({ label: b.description, value: b.id })),
        filter: true,
        colSpan: 4
      },
      {
        name: 'fromDate',
        label: 'Fecha Desde',
        type: 'date',
        required: false,
        colSpan: 2
      },
      {
        name: 'toDate',
        label: 'Fecha Hasta',
        type: 'date',
        required: false,
        colSpan: 2
      },
      {
        name: 'determinationIds',
        label: 'Determinaciones',
        type: 'multiselect',
        required: false,
        placeholder: 'Seleccione una o más determinaciones (opcional)',
        options: determinations.map(d => ({ label: d.name, value: d.id })),
        filter: true,
        colSpan: 4,
        display: 'chip'
      },
      {
        name: 'comments',
        label: 'Comentarios',
        type: 'textarea',
        placeholder: 'Ingrese comentarios adicionales (opcional)',
        rows: 3,
        colSpan: 4
      }
    ];
  }

  /**
   * Loads available time slots for the selected branch.
   * Filters out fully booked slots from the results.
   * @param branchId ID of the selected branch
   */
  private loadSlotsForBranch(branchId: number): void {
    this.currentBranchId = branchId;
    this.loadingSlots = true;
    this.availableSlots = [];
    this.selectedSlotId = null;

    const query: any = { branchId };
    if (this.fromDate) query.fromDate = this.fromDate;
    if (this.toDate) query.toDate = this.toDate;

    this.appointmentConfigService.getAvailability(query).subscribe({
      next: (slots: any[]) => {
        this.availableSlots = slots.filter(s => !s.is_fully_booked && !s.isFullyBooked);
        this.loadingSlots = false;
      },
      error: () => (this.loadingSlots = false)
    });
  }

  /**
   * Selects a time slot for the appointment.
   * @param slotId ID of the selected time slot
   */
  selectSlot(slotId: string): void {
    this.selectedSlotId = slotId;
  }

  /**
   * Submits the appointment creation form.
   * Validates required fields and sends the request to the backend.
   * @param form Form data containing branchId, determinationIds, and comments
   */
  onSubmit(form: any): void {
    if (!this.selectedSlotId) {
      this.errorMessage = 'Debe seleccionar un horario disponible';
      return;
    }

    if (!form.branchId) {
      this.errorMessage = 'Debe seleccionar una sucursal';
      return;
    }

    this.isSaving = true;
    this.showAlert = false;

    const payload: CreateAppointmentRequest = {
      patient_id: Number(this.patientId),
      branch_id: Number(form.branchId),
      slot_id: String(this.selectedSlotId),
      determination_ids: (form.determinationIds ?? []).map((x: any) => Number(x)),
      comments: form.comments ?? ''
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.showAlert = true;
        this.alertType = 'success';
        this.alertTitle = '¡Turno creado exitosamente!';
        this.alertMessage = 'El turno ha sido registrado correctamente en el sistema.';

        setTimeout(() => {
          this.dialogRef.close({ success: true, data: response });
        }, 2000);
      },
      error: (error) => {
        this.isSaving = false;
        this.showAlert = true;
        this.alertType = 'error';
        this.alertTitle = 'Error al crear el turno';
        this.alertMessage = error.error?.message || error.error?.error || 'Ocurrió un error inesperado. Por favor, intente nuevamente.';
      }
    });
  }

  /**
   * Cancels the appointment creation and closes the dialog.
   */
  onCancel(): void {
    this.dialogRef.close({ success: false });
  }
}
