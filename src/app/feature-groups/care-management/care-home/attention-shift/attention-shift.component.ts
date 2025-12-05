import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, TemplateRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { InputNumberModule } from 'primeng/inputnumber';
import { map, of, Subscription } from 'rxjs';

import { catchError } from 'rxjs/operators';

import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PollingService } from '../../../../shared/services/PollingService';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { PollingInstance } from '../../../../shared/utils/PollingInstance';
import { PatientResponse } from '../../../patients/models/PatientModel';
import { PatientService } from '../../../patients/services/PatientService';
import { QueueResponseDto, QueueStatusEnum } from '../../../queue';
import { QueueService } from '../../../queue';
import { AttentionShift } from '../../models/attention-shift';
import { Branch } from '../../models/branch';
import { BranchService } from '../../services/branch.service';

/**
 * Component for managing attention shifts from queue
 */
@Component({
  selector: 'app-attention-shift',
  templateUrl: './attention-shift.component.html',
  styleUrls: ['./attention-shift.component.css'],
  standalone: true,
  imports: [
    GenericButtonComponent,
    GenericBadgeComponent,
    GenericTableComponent,
    GenericModalComponent,
    CommonModule,
    DatePipe,
    GenericAlertComponent,
    InputNumberModule,
    FormsModule,
    TutorialOverlayComponent,
    SpinnerComponent
  ]
})
export class AttentionShiftComponent implements OnInit, OnDestroy {

  /** Polling Instance. */
  polling!: PollingInstance<{ totalRecords: number }>;

  /** For polling.*/
  totalRecords = 0;

  alertVisible: boolean = false;
  alertType: AlertType = 'info';
  alertTitle: string = '';
  alertMessage: string = '';
  /** Datos filtrados a mostrar en la tabla */
  queuePatients: QueueResponseDto[] = [];
  /** Datos completos (sin filtros) */
  private allQueuePatients: QueueResponseDto[] = [];
  columns: any[] = [];
  loading = signal<boolean>(false);
  /** Configuración de filtros para la tabla */
  filters: Filter[] = [];

  showBoxConfigDialog: boolean = false;
  showBlankAttentionDialog: boolean = false;
  patientExists: boolean = false;
  patientDniInput: number | null = null;

  boxes: number[] = [];
  selectedBox: number | null = null;

  @ViewChild('dateTimeTemplate', { static: true }) dateTimeTemplate!: TemplateRef<any>;
  @ViewChild('hasAppointmentTemplate', { static: true }) hasAppointmentTemplate!: TemplateRef<any>;
  /** Template reference for the tutorial overlay. */
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  private alertTimeoutId: any = null;
  private currentBranchId: number = 1;

  /** Key de localStorage para obtener usuario */
  private userKey = 'auth_user';

  /** Subscription to the global TutorialService trigger stream. */
  private tutorialSub?: Subscription;

  /** Configuration for the tutorial steps. */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Turnos de atención',
        message: 'Aquí puedes ver y administrar todos los turnos de atención del sistema.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Registrar nuevo turno',
        message: 'Haz clic aquí para abrir el formulario de registro de un nuevo turno de atención.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros avanzados',
        message: 'Usa este botón para filtrar detalle de la atención por turno (con turno o sin turno)',
        position: 'right',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table button:has(.pi-download)',
        title: 'Exportar tabla',
        message: 'Usa este botón para exportar los datos de la tabla en formato pdf o excel.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de Acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada turno de atencion.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones',
        message: 'Desde este menú puedes atender o cancelar un turno de atencion.',
        position: 'left',
        highlightPadding: 10,
        onEnter: () => {
          if (!document.querySelector('.p-popover-content')) {
            const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
            if (firstMenuButton) {
              firstMenuButton.click();
            }
          }
        }
      }
    ],
    onComplete: () => {
      // You can add logic here for when the tutorial is completed
    },
    onSkip: () => {
      // You can add logic here for when the tutorial is skipped
    }
  });

  /**
   * Services injection
   */
  constructor(
    private queueService: QueueService,
    private patientService: PatientService,
    private brancheService: BranchService,
    private router: Router,
    private tutorialService: TutorialService,
    private breadcrumbService: BreadcrumbService,
    private pollingService: PollingService
  ) {
  }

  /**
   * Initializes polling.
   */
  initializePolling() {
    this.polling?.stop();

    this.polling = this.pollingService.createPolling({
      intervalStart: 30000, // initial polling interval
      intervalMin: 20000, // high trafic
      intervalMax: 60000, // low trafic
      activityThreshold: 10, // the threshold to determine if there is high traffic
      quietThreshold: 3, // the threshold to determine if there is low traffic

      request: () => this.loadQueueDataForPolling(),

      detectChanges: (prev, next) => {
        if (!prev) return next.totalRecords;
        return next.totalRecords - prev.totalRecords;
      }
    });

    // If there is a change actualizes the table
    this.polling.data$.subscribe(change => {
      if (!change) return;

      const currentCount = this.queuePatients.length;

      // Compares the quantity of records retrieve in the polling if there is more or less updates the table
      if (change.totalRecords !== currentCount) {
        this.loadQueueData();
      }
    });
  }

  /**
   * Initialize component and load queue data
   */
  ngOnInit(): void {
    this.currentBranchId = this.getBranchId();

    this.setBoxesCount();

    const saved = localStorage.getItem('selectedBox');
    if (saved) this.selectedBox = Number(saved);

    this.columns = [
      { field: 'publicCode', header: 'Código', sortable: true },
      { field: 'nationalId', header: 'Documento', sortable: true },
      { field: 'date', header: 'Fecha', sortable: true },
      { field: 'time', header: 'Hora', sortable: true },
      { field: 'hasAppointment', header: 'Turno', template: this.hasAppointmentTemplate, sortable: true }
    ];

    // Configuración de filtros (Turno y Rango de Fecha)
    this.filters = [
      {
        id: 'hasAppointment',
        label: 'Turno',
        type: 'radio',
        options: [
          { label: 'Todos', value: null, active: true },
          { label: 'Con turno', value: true, active: false },
          { label: 'Sin turno', value: false, active: false }
        ]
      }
    ];

    this.columnTemplates.set('createdAt', this.dateTimeTemplate);
    this.columnTemplates.set('hasAppointment', this.hasAppointmentTemplate);

    this.loadQueueData();

    // Check if returning from workflow with queue update
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['queueUpdated']) {
      this.showGenericAlert('success', 'Atención completada', 'El estado de la cola fue actualizado correctamente.');
    }

    this.breadcrumbService.setBreadcrumbs([
      { label: 'Gestión de atenciones', route: '/care-management/attentions' },
      { label: 'Turnos de atención' }
    ]);

    // Subscribe to tutorial trigger
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('attentions')) return;

      setTimeout(() => {
        if (this.tutorialOverlay) {
          this.tutorialOverlay.start();
        }
      }, 100);
    });

    // Initializes polling
    this.initializePolling();
  }

  /**
   * Component cleanup.
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
    if (this.polling) {
      this.polling.stop();
    }
  }

  /**
   * Returns available actions for a given queue patient row.
   */
  getActionsForRow = (patient: QueueResponseDto) => {
    return [
      {
        label: 'Atender',
        icon: 'pi pi-check',
        command: () => this.onAtender(patient)
      },
      {
        label: 'Cancelar',
        icon: 'pi pi-times',
        command: () => this.onCancelQueue(patient)
      }
    ];
  };

  /**
   * Loads queue data from QueueService
   */
  private loadQueueData(): void {
    this.loading.set(true);
    this.queueService.getQueue(this.currentBranchId, 1).subscribe({
      next: (response) => {
        this.allQueuePatients = response.content
          .filter((patient) => patient.status === QueueStatusEnum.PENDING)
          .map(patient => {
            const createdDate = new Date(patient.createdAt);
            return {
              ...patient,
              date: createdDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              time: createdDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            };
          });

        // El filtro por defecto es "Todos", así que mostramos todos los pacientes.
        this.queuePatients = [...this.allQueuePatients];

        if (this.queuePatients.length === 0) {
          this.showGenericAlert('info', 'Cola vacía', 'No hay pacientes en espera en este momento.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.showGenericAlert(
          'error',
          'Error al cargar cola',
          'No se pudo cargar la cola de pacientes. Por favor, intente nuevamente.'
        );
        this.allQueuePatients = [];
        this.queuePatients = [];
        this.loading.set(false);
      }
    });
  }

  /**
   * Light version that only retrieves if there is a change.
   */
  private loadQueueDataForPolling() {
    return this.queueService.getQueue(this.currentBranchId, 1).pipe(
      map(response => {
        const pending = response.content.filter(
          patient => patient.status === QueueStatusEnum.PENDING
        );
        return { totalRecords: pending.length };
      }),
      catchError(() => of({ totalRecords: 0 }))
    );
  }

  /**
   * Navigates to workflow with patient data
   * Fetches appointment data if patient has appointment
   * @param patient Queue patient to attend
   */
  onAtender(patient: QueueResponseDto): void {
    if (!this.selectedBox) {
      this.showGenericAlert(
        'warning',
        'Box no configurado',
        'Debe configurar un box antes de atender pacientes. Use el botón "Configurar Box".'
      );
      return;
    }

    if (patient.hasAppointment) {
      this.showGenericAlert('info', 'Cargando', 'Obteniendo datos del turno...');

      this.queueService.getPatientByPublicCode(patient.publicCode).subscribe({
        next: (appointmentData: any) => {
          const appointmentId = appointmentData?.appointmentResponseDto?.id || 0;

          if (appointmentId === 0) {
            this.showGenericAlert(
              'warning',
              'Advertencia',
              'No se pudo obtener el ID del turno. Se continuará sin precarga de datos.'
            );
          }

          const shift: AttentionShift = {
            nro: patient.publicCode,
            document: parseInt(patient.nationalId, 10),
            dateTime: patient.createdAt,
            appointmentId: appointmentId,
            hasData: appointmentId > 0,
            hasShift: true,
            branchId: this.currentBranchId,
            boxNumber: this.selectedBox || 1
          };

          this.updateQueueStatusCompleted(patient);
          //this.navigateToWorkflow(shift, patient);
          this.navigateToEditPatient(shift.document, shift.nro);
        },
        error: () => {
          this.showGenericAlert(
            'error',
            'Error',
            'No se pudo obtener los datos del turno. Se continuará sin precarga.'
          );

          const shift: AttentionShift = {
            nro: patient.publicCode,
            document: parseInt(patient.nationalId, 10),
            dateTime: patient.createdAt,
            appointmentId: 0,
            hasData: false,
            hasShift: true,
            branchId: this.currentBranchId,
            boxNumber: this.selectedBox || 1
          };

          this.updateQueueStatusCompleted(patient);
          //this.navigateToWorkflow(shift, patient);
          this.navigateToEditPatient(shift.document, shift.nro);
        }
      });
    } else {
      const shift: AttentionShift = {
        nro: patient.publicCode,
        document: parseInt(patient.nationalId, 10),
        dateTime: patient.createdAt,
        appointmentId: 0,
        hasData: false,
        hasShift: false,
        branchId: this.currentBranchId,
        boxNumber: this.selectedBox || 1
      };

      this.updateQueueStatusCompleted(patient);
      this.navigateToEditPatient(shift.document, shift.nro);
    }
  }

  /**
   * Cancels queue entry and updates status to CANCELED
   * @param patient Queue patient to cancel
   */
  onCancelQueue(patient: QueueResponseDto): void {
    this.queueService.updateQueueStatus({
      publicCode: patient.publicCode,
      nationalId: patient.nationalId,
      status: QueueStatusEnum.CANCELED,
      branchId: this.currentBranchId,
      boxNumber: this.selectedBox || 1
    }).subscribe({
      next: () => {
        this.showGenericAlert('success', 'Cancelado', 'La entrada en cola fue cancelada correctamente.');
        this.loadQueueData(); // Reload queue to reflect changes
      },
      error: () => {
        this.showGenericAlert('error', 'Error', 'No se pudo cancelar la entrada en cola.');
      }
    });
  }

  /**
   * Updates queue status to COMPLETED
   */
  private updateQueueStatusCompleted(patient: QueueResponseDto): void {
    this.queueService.updateQueueStatus({
      publicCode: patient.publicCode,
      nationalId: patient.nationalId,
      status: QueueStatusEnum.COMPLETED,
      branchId: this.currentBranchId,
      boxNumber: this.selectedBox || 1
    }).subscribe({
      error: () => {
        this.showGenericAlert('error', 'Error', 'No se pudo llamar al paciente.');
      }
    });
  }

  /**
   * Navigates to workflow with shift and patient data
   */
  private navigateToWorkflow(shift: AttentionShift, patient: QueueResponseDto): void {
    this.router.navigate(['/care-management/attentions/workflow'], {
      state: { shift: shift, patient: patient }
    });
  }

  /**
   * Opens dialog to create blank attention
   */
  onCreateBlankAttention(): void {
    this.patientDniInput = null;
    this.showBlankAttentionDialog = true;
  }

  /**
   * Handles blank attention dialog submission
   */
  onSubmitBlankAttention(): void {
    if (!this.selectedBox) {
      this.showGenericAlert(
        'warning',
        'Box no configurado',
        'Debe configurar un box antes de atender pacientes. Use el botón "Configurar Box".'
      );
      return;
    }

    if (!this.patientDniInput) {
      this.showGenericAlert('info', 'Validación', 'Por favor ingrese un DNI válido.');
      return;
    }

    this.showBlankAttentionDialog = false;
    this.navigateToEditPatient(this.patientDniInput);
  }

  /**
   * Navigates to edit patient if exists, otherwise to create patient form
   */
  private navigateToEditPatient(patientDni: number, publicCode?: string): void {
    // First check if patient exists
    this.patientService.existsByDni(patientDni.toString()).subscribe({
      next: (exists: boolean) => {
        if (exists) {
          // Patient exists, fetch full data and navigate to edit
          this.patientService.findByDNI(patientDni.toString()).subscribe({
            next: (patient: PatientResponse) => {
              if (patient) {
                this.router.navigate(['/patients/edit-patient', patient.id], {
                  queryParams: {
                    origen: 'atencion',
                    dni: patientDni,
                    publicCode: publicCode
                  }
                });
              }
            },
            error: () => {
              this.showGenericAlert('error', 'Error', 'No se pudo obtener los datos del paciente.');
            }
          });
        } else {
          // Patient doesn't exist, navigate to create form
          this.router.navigate(['/patients/form'], {
            queryParams: {
              origen: 'atencion',
              dni: patientDni,
              publicCode: publicCode
            }
          });
        }
      },
      error: () => {
        this.showGenericAlert('error', 'Error', 'No se pudo verificar si el paciente existe.');
      }
    });
  }

  /**
   * Cancels blank attention dialog
   */
  onCancelBlankAttention(): void {
    this.showBlankAttentionDialog = false;
    this.patientDniInput = null;
  }

  /**
   * Shows generic alert with auto-hide
   */
  public showGenericAlert(type: AlertType, title: string, message: string, durationMs = 5000): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertVisible = true;

    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
    }

    this.alertTimeoutId = setTimeout(() => {
      this.alertVisible = false;
      this.alertTimeoutId = null;
    }, durationMs);
  }

  /**
   * Maneja cambios en los filtros provenientes de la tabla genérica
   */
  onFilterChange(event: FilterChangeEvent): void {
    const active = event.filters || [];
    let data = [...this.allQueuePatients];

    // Filtro por Turno (hasAppointment)
    const appt = active.find(f => f.id === 'hasAppointment');
    if (appt && appt.value !== null && appt.value !== undefined) {
      data = data.filter(row => row.hasAppointment === (appt.value as boolean));
    }

    // Filtro por Rango de Fecha (createdAt)
    const date = active.find(f => f.id === 'createdAt');
    if (date && (date.dateFrom || date.dateTo)) {
      const from = date.dateFrom ? new Date(date.dateFrom) : null;
      const to = date.dateTo ? new Date(date.dateTo) : null;
      data = data.filter(row => {
        const d = new Date(row.createdAt);
        const afterFrom = from ? d >= this.normalizeStartOfDay(from) : true;
        const beforeTo = to ? d <= this.normalizeEndOfDay(to) : true;
        return afterFrom && beforeTo;
      });
    }

    this.queuePatients = data;
  }

  /**
   * Normalizes a given date to the **start of the day** (00:00:00.000).
   *
   * @param date - The input date to normalize.
   * @returns A new `Date` object set to midnight (start of the given day).
   *
   * @example
   * normalizeStartOfDay(new Date('2025-11-12T15:30:00'));
   * // Returns: 2025-11-12T00:00:00.000Z
   */
  private normalizeStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Normalizes a given date to the **end of the day** (23:59:59.999).
   *
   * @param date - The input date to normalize.
   * @returns A new `Date` object set to the last millisecond of the given day.
   *
   * @example
   * normalizeEndOfDay(new Date('2025-11-12T10:15:00'));
   * // Returns: 2025-11-12T23:59:59.999Z
   */
  private normalizeEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Obtiene el branchId desde localStorage usando la estructura auth_user.branch
   * @returns ID de la sucursal
   */
  private getBranchId(): number {
    const userDataRaw = localStorage.getItem(this.userKey);

    if (!userDataRaw) {
      throw new Error(`No se encontró '${this.userKey}' en localStorage`);
    }

    let userData: any;
    try {
      userData = JSON.parse(userDataRaw);
    } catch (e) {
      throw new Error(`Error al parsear '${this.userKey}': ${e}`);
    }

    const branchId = Number(userData?.branch);

    if (Number.isNaN(branchId) || !Number.isFinite(branchId)) {
      throw new Error(`El valor 'branch' del usuario no es válido: ${userData?.branch}`);
    }

    return branchId;
  }

  /**
   * Opens the box configuration dialog.
   */
  openBoxConfig() {
    this.selectedBox = this.boxes.length > 0 ? this.boxes[0] : null;
    this.showBoxConfigDialog = true;
  }

  /**
   * Cancela el dialogo de configuración de box
   */
  onCancelBoxConfig(): void {
    this.showBoxConfigDialog = false;
    this.selectedBox = null;
  }

  /**
   * Envía la configuración seleccionada del box
   */
  onSubmitBoxConfig(): void {
    if (this.selectedBox == null) {
      this.showGenericAlert('info', 'Validación', 'Por favor seleccioná un box.');
      return;
    }

    try {
      localStorage.setItem('selectedBox', String(this.selectedBox));
    } catch {

    }

    this.showBoxConfigDialog = false;
    this.showGenericAlert('success', 'Box configurado', `Se asignó BOX-${String(this.selectedBox).padStart(1, '0')}.`);
  }

  /**
   * Consulta el servicio de sucursal y setea el array `boxes` con los
   * números de box disponibles (1..boxCount). También deja `selectedBox`
   * apuntando al primer box si corresponde.
   */
  private setBoxesCount() {
    this.brancheService.getBranchById(this.currentBranchId).subscribe({
      next: (data: Branch) => {
        const count = Number(data?.assistantDesk) || 0;
        if (count <= 0) {
          this.boxes = [];
          this.selectedBox = null;
          return;
        }

        this.boxes = Array.from({ length: count }, (_, i) => i + 1);
      },
      error: () => {
        this.boxes = [];
        this.selectedBox = null;
      }
    });
  }

  /**
   * Sets the selected box number.
   * @param box The box number to select.
   */
  selectBox(box: number): void {
    this.selectedBox = box;
  }
}
