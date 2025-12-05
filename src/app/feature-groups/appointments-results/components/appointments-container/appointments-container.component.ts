import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { Card } from 'primeng/card';

import { Appointment } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';
import { AppointmentsFiltersComponent } from '../appointments-filters/appointments-filters.component';
import { AppointmentsTableComponent } from '../appointments-table/appointments-table.component';

/**
 *
 */
@Component({
  selector: 'app-appointments-container',
  standalone: true,
  imports: [CommonModule, AppointmentsFiltersComponent, AppointmentsTableComponent, Card],
  templateUrl: './appointments-container.component.html'
})
export class AppointmentsContainerComponent implements OnInit {
  data: any[] = [];
  totalRecords = 0;
  loading = false;
  currentFilters: any = {};

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  constructor(private appointmentService: AppointmentService) {}

  /**
   * Initialize component and load initial appointments.
   */
  ngOnInit(): void {
    this.loadAppointments(0, 10);
  }

  /**
   * Handles filter changes and loads appointments with the new filters.
   * @param filters Filter object
   */
  onFiltersChanged(filters: any): void {
    this.currentFilters = filters;
    this.loadAppointments(0, 10);
  }

  /**
   * Handles global search input and loads appointments accordingly.
   * @param value Search string
   */
  onGlobalSearch(value: string): void {
    if (value.length === 0) {
      delete this.currentFilters.searchCriteria;
      this.loadAppointments(0, 10);
    } else if (value.length >= 3) {
      this.currentFilters.searchCriteria = value;
      this.loadAppointments(0, 10);
    }
  }

  /**
   * Loads appointments from the backend using the current filters, page, and size.
   * @param page Page number
   * @param size Page size
   */
  loadAppointments(page: number, size: number): void {
    this.loading = true;
    this.appointmentService
      .getAppointments({ ...this.currentFilters, page, size })
      .subscribe({
        next: (res) => {
          this.data = res.content;
          this.totalRecords = res.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  onAppointmentSelected(appointment: Appointment): Appointment {
    return appointment;
  }
}
