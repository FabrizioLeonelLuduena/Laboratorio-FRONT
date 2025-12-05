import { Component, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { AppointmentFormComponent } from '../appointment-form/appointment-form.component';
import { AppointmentsContainerComponent } from '../appointments-container/appointments-container.component';

/**
 * Appointments & Results feature home component.
 */
@Component({
  selector: 'app-appointments-results',
  standalone: true,
  templateUrl: './appointments-home.component.html',
  imports: [
    AppointmentsContainerComponent,
    ButtonModule
  ],
  providers: [DialogService],
  styleUrl: './appointments-home.component.css'
})
export class AppointmentsHomeComponent {
  private dialogService = inject(DialogService);
  private dialogRef?: DynamicDialogRef;

  /**
   * Opens the appointment creation modal
   */
  openAppointmentForm(): void {
    this.dialogRef = this.dialogService.open(AppointmentFormComponent, {
      header: 'Crear Nuevo Turno',
      width: '800px',
      modal: true,
      focusOnShow: false,
      data: { patientId: 1 }
    });

  }
}
