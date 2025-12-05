import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';

// PrimeNG
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AdvancedTableComponent, GenericColumn, AdvancedTableConfig } from '../../../../shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { Appointment } from '../../models/appointment.model';

/**
 *
 */
@Component({
  selector: 'app-appointments-table',
  standalone: true,
  imports: [CommonModule, AdvancedTableComponent, ConfirmDialogModule, GenericAlertComponent],
  templateUrl: './appointments-table.component.html',
  styleUrls: ['./appointments-table.component.css'],
  providers: [ConfirmationService]
})
export class AppointmentsTableComponent implements OnInit, OnDestroy {
  @Input() data: Appointment[] = [];
  @Input() totalRecords = 0;
  @Input() loading = false;

  @Output() selectAppointment = new EventEmitter<Appointment>();

  selectedAppointment?: Appointment;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  columns: GenericColumn[] = [
    { field: 'patientName', header: 'Paciente' },
    { field: 'time', header: 'Hora' },
    { field: 'branchName', header: 'Sucursal' },
    { field: 'status', header: 'Estado' }
  ];

  config: AdvancedTableConfig = {
    paginator: true,
    rows: 10,
    lazy: true,
    showGlobalFilter: false
  };

  private clickListener?: () => void;

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private confirmationService: ConfirmationService
  ) {}

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  ngOnInit(): void {
    this.clickListener = this.renderer.listen(this.el.nativeElement, 'click', (event: Event) => {
      const rowEl = (event.target as HTMLElement).closest('tr');
      if (!rowEl || !rowEl.parentElement) return;

      const index = Array.from(rowEl.parentElement.children).indexOf(rowEl);
      const clicked = this.data[index];
      if (!clicked) return;

      this.clearSelections();
      rowEl.classList.add('selected-row');
      this.selectedAppointment = clicked;

      this.confirmationService.confirm({
        message: `¿Confirmás la selección del turno de <b>${clicked.patientName}</b> a las <b>${clicked.time}</b>?`,
        header: 'Confirmar turno',
        icon: 'pi pi-calendar-check',
        acceptLabel: 'Sí, seleccionar',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-success',
        rejectButtonStyleClass: 'p-button-text',
        accept: () => {
          this.showAlert('success', 'Turno seleccionado', `${clicked.patientName} - ${clicked.time}`);
          this.selectAppointment.emit(clicked);
        },
        reject: () => {
          this.clearSelections();
          this.selectedAppointment = undefined;
        }
      });
    });
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  private clearSelections(): void {
    const rows = this.el.nativeElement.querySelectorAll('tr.selected-row');
    rows.forEach((r: HTMLElement) => r.classList.remove('selected-row'));
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  ngOnDestroy(): void {
    this.clickListener?.();
  }

  /**
   * Helper method to display alert messages
   * @param type - Type of alert (success, error, warning, info)
   * @param title - Alert title
   * @param text - Alert message text
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 2500);
  }
}
