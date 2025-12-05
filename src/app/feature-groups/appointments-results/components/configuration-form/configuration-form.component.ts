import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

/* PrimeNG (standalone) */
import { CardModule } from 'primeng/card';
import { Divider } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { ToggleButtonModule, ToggleButtonChangeEvent } from 'primeng/togglebutton';
import { Subject, takeUntil } from 'rxjs';

/* Own components */
import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from
  '../../../../shared/components/generic-button/generic-button.component';
/* New Generic Form (full version) */
import {
  GenericFormComponent,
  GenericFormField
} from '../../../../shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { BranchService } from '../../../care-management/services/branch.service';
import {
  AppointmentConfiguration,
  CreateAppointmentConfiguration,
  UpdateAppointmentConfiguration
} from '../../models';
import { HttpErrorResponse } from '../../models';
import { AppointmentConfigurationService } from '../../services/appointment-configuration.service';
import { NotificationService } from '../../services/notification.service';

/**
 * Component for managing appointment configuration forms.
 * Handles both creation and editing of appointment configurations with support for
 * recurring and non-recurring schedules.
 */
@Component({
  selector: 'app-configuration-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,

    // PrimeNG
    CardModule,
    InputTextModule,
    ToggleButtonModule,
    MultiSelect,

    // propios
    GenericButtonComponent,
    GenericAlertComponent,

    // form genérico nuevo
    GenericFormComponent,
    Divider
  ],
  templateUrl: './configuration-form.component.html',
  styleUrls: ['./configuration-form.component.css']
})
export class ConfigurationFormComponent implements OnInit, OnDestroy {
  private readonly appointmentService = inject(AppointmentConfigurationService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();
  private readonly SKELETON_MIN_DISPLAY_TIME_MS = 300;
  private pageTitleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);

  // UI state
  readonly loading = signal(true); // Initialize to true
  readonly saving = signal(false);
  readonly togglingActive = signal(false);
  readonly isEditing = signal(false);
  readonly currentConfig = signal<AppointmentConfiguration | null>(null);

  // alerts
  readonly showError = signal(false);
  readonly errorMessage = signal('');
  readonly errorTitle = signal('Error');

  readonly showSuccess = signal(false);
  readonly successMessage = signal('');
  readonly successTitle = signal('Éxito');

  // active state
  readonly active = signal<boolean>(true);

  // options
  private branchService = inject(BranchService);

  branchOptions: any[] = [];
  selectedBranchSchedules: any[] = [];
  branchMinTime: string = ''; // Minimum time allowed by the branch
  branchMaxTime: string = ''; // Maximum time allowed by the branch
  allowedDays: number[] = []; // Allowed days by the branch (1-7)
  /**
   * Gets branches for form dropdown options
   */
  private getBranches() {
    this.branchService.getAllBranches({ estado: 'ACTIVE' }, 0, 100, 'description,asc').subscribe({
      next: (response) => {
        this.branchOptions = response.content || [];

        this.fields = this.buildFields();

        const idParam = this.route.snapshot.paramMap.get('id');
        this.setupContextFromRouteOrService();

        // Only disable loading if we are NOT loading by ID
        if (!idParam) {
          setTimeout(() => this.loading.set(false), this.SKELETON_MIN_DISPLAY_TIME_MS);
        }
      },
      error: () => {
        this.showAlert('error', 'Error al cargar las sucursales.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Displays a temporary alert on screen
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  // ===== Externally controlled fields =====
  // schedules (HH:mm)
  startTimeExt = '';
  endTimeExt = '';
  readonly startTimeError = signal<string | null>(null);
  readonly endTimeError = signal<string | null>(null);

  // Flag to control if user manually modified end time
  private userModifiedEndTime = false;

  // days of the week (1..7)
  private baseDayOptions = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  /**
   * Gets day options with disabled state based on allowed days from branch schedule.
   * If a branch is selected and has allowed days, only those days will be enabled.
   */
  get dayOptions() {
    if (this.allowedDays.length === 0) {
      // No restrictions, all days enabled
      return this.baseDayOptions.map(day => ({ ...day, disabled: false }));
    }

    // Disable days that are not in the allowed list
    return this.baseDayOptions.map(day => ({
      ...day,
      disabled: !this.allowedDays.includes(day.value)
    }));
  }

  recurringDaysOfWeek: number[] = [];
  readonly daysError = signal<string | null>(null);

  // ====== GenericForm ======
  fields: GenericFormField[] = [];
  initialValue: Record<string, any> = {};

  private _genericFormRef?: GenericFormComponent;

  /**
   * Sets the generic form reference and initializes subscriptions when available
   * @param ref - The GenericFormComponent reference
   */
  @ViewChild('cfgGF')
  set genericFormRef(ref: GenericFormComponent | undefined) {
    if (ref && ref.form && !this._genericFormRef) {
      this._genericFormRef = ref;
      this.setupSubscriptions(); // Method that contains the subscription logic
    }
  }

  /**
   * Gets the generic form reference
   * @returns The GenericFormComponent reference or undefined
   */
  get genericFormRef(): GenericFormComponent | undefined {
    return this._genericFormRef;
  }

  /** Generic form date range validator (validFromDate <= validToDate) */
  gfDateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const startCtrl = group.get('validFromDate');
    const endCtrl = group.get('validToDate');

    const start = startCtrl?.value;
    const end = endCtrl?.value;

    if (!start || !end) {
      // Clear errors if values are missing
      if (startCtrl?.hasError('dateMax')) {
        const errors = { ...startCtrl.errors };
        delete errors['dateMax'];
        startCtrl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      if (endCtrl?.hasError('dateMin')) {
        const errors = { ...endCtrl.errors };
        delete errors['dateMin'];
        endCtrl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return null;
    }

    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);

    if (e > s) {
      // Dates are valid, clear custom errors
      if (startCtrl?.hasError('dateMax')) {
        const errors = { ...startCtrl.errors };
        delete errors['dateMax'];
        startCtrl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      if (endCtrl?.hasError('dateMin')) {
        const errors = { ...endCtrl.errors };
        delete errors['dateMin'];
        endCtrl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return null;
    } else {
      // Dates are invalid, set errors on each field
      // validFromDate must be before validToDate (dateMax error)
      startCtrl?.setErrors({
        ...startCtrl.errors,
        dateMax: e
      });

      // validToDate must be after validFromDate (dateMin error)
      endCtrl?.setErrors({
        ...endCtrl.errors,
        dateMin: s
      });

      return { dateRange: true };
    }
  };

  // ====== Lifecycle ======
  /**
   * Lifecycle hook that is called after Angular has initialized all data-bound properties.
   * Sets the page title and loads branches, then sets up the context from route or service.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Turnos');
    this.getBranches();
  }

  /**
   * Configures form field subscriptions
   * Called from ViewChild setter when genericFormRef is available
   */
  private setupSubscriptions(): void {
    if (!this._genericFormRef?.form) return;

    const branchControl = this._genericFormRef.form.get('branchId');

    if (branchControl) {
      branchControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((branchId: number) => {
          this.onBranchSelected(branchId);
        });
    }

    this._genericFormRef.form.get('slotDurationMinutes')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateEndTime());

    this._genericFormRef.form.get('appointmentsCount')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateEndTime());
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * Completes the destroy$ subject to clean up subscriptions.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ====== Branch selection handler ======
  /**
   * Handles branch selection and copies the schedules from the selected branch.
   * @param branchId - The ID of the selected branch
   */
  private onBranchSelected(branchId: number): void {
    if (!branchId) {
      this.selectedBranchSchedules = [];
      this.clearScheduleFields();
      return;
    }

    // Find the selected branch in the options
    const selectedBranch = this.branchOptions.find(b => b.id === branchId);

    if (selectedBranch) {
      // Deep copy the schedules array to avoid reference issues
      this.selectedBranchSchedules = selectedBranch.schedules
        ? JSON.parse(JSON.stringify(selectedBranch.schedules))
        : [];

      // Create object with id, name (description) and schedules to display in console
      const branchData = {
        id: selectedBranch.id,
        name: selectedBranch.description,
        schedules: this.selectedBranchSchedules
      };

      // eslint-disable-next-line no-console -- Debug info for selected branch
      console.log(branchData);

      // Auto-fill schedule fields with the first schedule if available
      this.autoFillScheduleFields();
    } else {
      this.selectedBranchSchedules = [];
      this.clearScheduleFields();
    }
  }

  /**
   * Auto-fills schedule fields (start time, end time, days) based on the first schedule
   * from the selected branch.
   */
  private autoFillScheduleFields(): void {
    if (this.selectedBranchSchedules.length === 0) {
      this.branchMinTime = '';
      this.branchMaxTime = '';
      this.allowedDays = [];
      return;
    }

    // Take the first schedule as default
    const firstSchedule = this.selectedBranchSchedules[0];

    // Set start and end times (remove seconds if present)
    if (firstSchedule.scheduleFromTime) {
      this.startTimeExt = firstSchedule.scheduleFromTime.substring(0, 5);
      this.branchMinTime = firstSchedule.scheduleFromTime.substring(0, 5);
    }
    if (firstSchedule.scheduleToTime) {
      this.endTimeExt = firstSchedule.scheduleToTime.substring(0, 5);
      this.branchMaxTime = firstSchedule.scheduleToTime.substring(0, 5);
    }

    // Set days of week based on dayFrom and dayTo
    if (firstSchedule.dayFrom && firstSchedule.dayTo) {
      this.allowedDays = this.convertDayRangeToDayNumbers(
        firstSchedule.dayFrom,
        firstSchedule.dayTo
      );
      // Pre-select the allowed days
      this.recurringDaysOfWeek = [...this.allowedDays];
    }

    // Mark that the end time was filled by the system, NOT manually by the user
    // This allows automatic recalculation when slot duration or appointments count changes
    this.userModifiedEndTime = false;

    // Validate the auto-filled values
    this.validateTimes();
    this.validateDays();
  }

  /**
   * Converts day range (e.g., "Monday" to "Friday") to an array of day numbers (1-7).
   * @param dayFrom - Starting day (e.g., "Monday")
   * @param dayTo - Ending day (e.g., "Friday")
   * @returns Array of day numbers
   */
  private convertDayRangeToDayNumbers(dayFrom: string, dayTo: string): number[] {
    const dayMap: Record<string, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };

    const startDay = dayMap[dayFrom] || 1;
    const endDay = dayMap[dayTo] || 1;

    const days: number[] = [];
    if (startDay <= endDay) {
      // Normal range (e.g., Monday to Friday)
      for (let i = startDay; i <= endDay; i++) {
        days.push(i);
      }
    } else {
      // Wrapping range (e.g., Saturday to Monday)
      for (let i = startDay; i <= 7; i++) {
        days.push(i);
      }
      for (let i = 1; i <= endDay; i++) {
        days.push(i);
      }
    }

    return days;
  }

  /**
   * Clears all schedule-related fields.
   */
  private clearScheduleFields(): void {
    this.startTimeExt = '';
    this.endTimeExt = '';
    this.recurringDaysOfWeek = [];
    this.userModifiedEndTime = false;
    this.branchMinTime = '';
    this.branchMaxTime = '';
    this.allowedDays = [];
    this.startTimeError.set(null);
    this.endTimeError.set(null);
    this.daysError.set(null);
  }

  // ====== GenericForm field definition ======
  /**
   * Builds the form fields dynamically based on available branches.
   * Returns an array of GenericFormField objects that define the structure and validation of the form.
   */
  private buildFields(): GenericFormField[] {
    return [
      { type: 'divider', name: '_div_branch', label: 'Información de sucursal', align: 'left' },
      {
        name: 'branchId',
        label: 'Sucursal',
        type: 'select',
        required: true,
        colSpan: 2,
        options: this.branchOptions.map(b => ({ label: b.description, value: b.id })),
        filter: true,
        filterBy: 'label',
        messages: { required: 'La sucursal es requerida' },
        placeholder: 'Seleccioná una sucursal',
        appendTo: 'body'
      },

      { type: 'divider', name: '_div_slots', label: 'Configuración de turnos', align: 'left' },
      {
        name: 'slotDurationMinutes',
        label: 'Duración del turno (minutos)',
        type: 'number',
        required: true,
        min: 5,
        colSpan: 1,
        messages: {
          required: 'La duración del turno es requerida',
          min: 'Debe ser al menos 5 minutos'
        }
      },
      {
        name: 'appointmentsCount',
        label: 'Cantidad de turnos',
        type: 'number',
        required: true,
        min: 1,
        colSpan: 1,
        messages: {
          required: 'La cantidad de turnos es requerida',
          min: 'Debe ser al menos 1 turno'
        }
      },

      { type: 'divider', name: '_div_period', label: 'Período de validez', align: 'left' },
      {
        name: 'validFromDate',
        label: 'Fecha de inicio',
        type: 'date',
        required: true,
        colSpan: 1,
        dateFormat: 'dd/mm/yy',
        messages: {
          required: 'La fecha de inicio es requerida',
          dateMax: 'La fecha de inicio debe ser anterior a la fecha de fin'
        }
      },
      {
        name: 'validToDate',
        label: 'Fecha de fin',
        type: 'date',
        required: true,
        colSpan: 1,
        dateFormat: 'dd/mm/yy',
        messages: {
          required: 'La fecha de fin es requerida',
          dateMin: 'La fecha de fin debe ser posterior a la fecha de inicio'
        }
      }
    ];
  }

  // ====== Context (load/edit) ======
  /**
   * Sets up the component context based on route parameters or service state.
   * Loads existing configuration for editing or initializes a new configuration.
   */
  private setupContextFromRouteOrService(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const id = Number(idParam);
      if (Number.isFinite(id) && id > 0) {
        this.appointmentService.getConfigurationById(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (cfg) => {
              this.isEditing.set(true);
              this.currentConfig.set(cfg);
              this.active.set(cfg.active);

              this.initialValue = this.mapConfigToInitial(cfg);
              this.appointmentService.setSelectedBranch(cfg.branchId);

              this.startTimeExt = (cfg.startTime ?? '').substring(0, 5);
              this.endTimeExt   = (cfg.endTime ?? '').substring(0, 5);
              this.recurringDaysOfWeek = this.parseRecurringDays(cfg.recurringDaysOfWeek);

              this.validateTimes();
              this.validateDays();

              this.breadcrumbService.setFromString('Gestión de turnos > Configuraciones > Editar', '/appointments-results/configuration');

              setTimeout(() => this.loading.set(false), this.SKELETON_MIN_DISPLAY_TIME_MS);
            },
            error: (err) => {
              this.handleApiError('No se pudo cargar la configuración', err);
              this.resetForCreate();
              this.loading.set(false);
            }
          });
        return;
      }
    }

    // create new
    const cfg = this.appointmentService.getSelectedConfiguration();
    const branch = this.appointmentService.getSelectedBranch();
    if (cfg) {
      this.isEditing.set(true);
      this.currentConfig.set(cfg);
      this.active.set(cfg.active);

      this.initialValue = this.mapConfigToInitial(cfg);
      this.startTimeExt = (cfg.startTime ?? '').substring(0, 5);
      this.endTimeExt   = (cfg.endTime ?? '').substring(0, 5);
      this.recurringDaysOfWeek = this.parseRecurringDays(cfg.recurringDaysOfWeek);

      this.validateTimes();
      this.validateDays();

      this.breadcrumbService.setFromString('Gestión de turnos > Configuraciones > Editar', '/appointments-results/configuration');
    } else {
      this.resetForCreate(branch ?? null);
      this.breadcrumbService.setFromString('Gestión de turnos > Configuraciones > Crear', '/appointments-results/configuration');
    }
  }

  /**
   * Parses recurringDaysOfWeek from backend format to array of numbers.
   * Backend may send it as string "1,2,3" or array [1,2,3].
   * @param daysOfWeek - Days of week from backend
   * @returns Array of day numbers sorted
   */
  private parseRecurringDays(daysOfWeek: string | number[] | null | undefined): number[] {
    if (!daysOfWeek) return [];

    if (Array.isArray(daysOfWeek)) {
      return [...daysOfWeek].sort((a, b) => a - b);
    }

    if (typeof daysOfWeek === 'string') {
      return daysOfWeek
        .split(',')
        .map(day => Number(day.trim()))
        .filter(day => !isNaN(day))
        .sort((a, b) => a - b);
    }

    return [];
  }

  /**
   * Resets the form to create mode with optional preselected branch.
   * @param preselectedBranch - Optional branch ID to preselect
   */
  private resetForCreate(preselectedBranch: number | null = null): void {
    const today = this.today();
    this.isEditing.set(false);
    this.currentConfig.set(null);
    this.active.set(true);

    this.startTimeExt = '';
    this.endTimeExt = '';
    this.startTimeError.set(null);
    this.endTimeError.set(null);

    this.recurringDaysOfWeek = [];
    this.daysError.set(null);

    this.initialValue = {
      branchId: preselectedBranch,
      slotDurationMinutes: 30,
      appointmentsCount: 1,
      isRecurring: true,
      validFromDate: today,
      validToDate: null
    };
  }

  /**
   * Maps configuration object to initial form values.
   * @param cfg - The appointment configuration to map
   * @returns Object with mapped form values
   */
  private mapConfigToInitial(cfg: AppointmentConfiguration): Record<string, any> {
    return {
      branchId: cfg.branchId,
      slotDurationMinutes: cfg.slotDurationMinutes,
      appointmentsCount: cfg.appointmentsCount,
      isRecurring: cfg.isRecurring,
      validFromDate: this.parseDate(cfg.validFromDate),
      validToDate: this.parseDate(cfg.validToDate)
    };
  }

  // ====== External interactions ======
  /**
   * Executed when start time changes
   */
  onStartTimePick(): void {
    // Only auto-calculate if the user has NEVER manually modified the end time
    // If they have, respect their choice and only validate
    this.calculateEndTime();
    this.validateTimes();
  }

  /**
   * Executed when user manually modifies end time
   */
  onEndTimePick(): void {
    this.userModifiedEndTime = true;
    this.validateTimes();
  }

  /**
   * Automatically calculates end time based on:
   * - Start time
   * - Slot duration (minutes)
   * - Appointments count
   *
   * Only calculates if user hasn't manually modified end time
   */
  private calculateEndTime(): void {
    if (this.userModifiedEndTime) {
      return;
    }

    if (!this.startTimeExt) {
      return;
    }

    let slotDuration: number;
    let appointmentsCount: number;

    if (this.genericFormRef?.form) {
      slotDuration = this.genericFormRef.form.get('slotDurationMinutes')?.value || 0;
      appointmentsCount = this.genericFormRef.form.get('appointmentsCount')?.value || 0;
    } else {
      slotDuration = this.initialValue['slotDurationMinutes'] || 0;
      appointmentsCount = this.initialValue['appointmentsCount'] || 0;
    }

    if (!slotDuration || !appointmentsCount) {
      return;
    }

    const [hours, minutes] = this.startTimeExt.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours || 0, minutes || 0, 0, 0);

    const totalMinutes = slotDuration * appointmentsCount;
    const endDate = new Date(startDate.getTime() + totalMinutes * 60000);

    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

    this.endTimeExt = `${endHours}:${endMinutes}`;
    this.validateTimes();
  }

  // ====== External validations (schedule and days) ======
  /**
   * Validates time fields including required validation and time range validation.
   * Also validates that times are within the branch schedule limits.
   */
  private validateTimes(): void {
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    // Validar campo de hora de inicio
    if (!this.startTimeExt) {
      this.startTimeError.set('La hora de inicio es requerida');
    } else {
      // Validar que la hora de inicio esté dentro del rango de la sucursal
      if (this.branchMinTime && this.branchMaxTime) {
        const startMin = toMin(this.startTimeExt);
        const branchMin = toMin(this.branchMinTime);
        const branchMax = toMin(this.branchMaxTime);

        if (startMin < branchMin) {
          this.startTimeError.set(`La hora de inicio no puede ser anterior a ${this.branchMinTime}`);
        } else if (startMin > branchMax) {
          this.startTimeError.set(`La hora de inicio no puede ser posterior a ${this.branchMaxTime}`);
        } else {
          this.startTimeError.set(null);
        }
      } else {
        this.startTimeError.set(null);
      }
    }

    // Validar campo de hora de fin
    if (!this.endTimeExt) {
      this.endTimeError.set('La hora de fin es requerida');
      return;
    }

    // Validar que la hora de fin esté dentro del rango de la sucursal
    if (this.branchMinTime && this.branchMaxTime) {
      const endMin = toMin(this.endTimeExt);
      const branchMin = toMin(this.branchMinTime);
      const branchMax = toMin(this.branchMaxTime);

      if (endMin < branchMin) {
        this.endTimeError.set(`La hora de fin no puede ser anterior a ${this.branchMinTime}`);
        return;
      } else if (endMin > branchMax) {
        this.endTimeError.set(`La hora de fin no puede ser posterior a ${this.branchMaxTime}`);
        return;
      }
    }

    // If both fields have values, validate the range
    if (this.startTimeExt && this.endTimeExt) {
      const start = toMin(this.startTimeExt);
      const end = toMin(this.endTimeExt);

      if (end <= start) {
        this.endTimeError.set('La hora de fin debe ser posterior a la de inicio');
        return;
      }

      const minDur = 30;
      if ((end - start) < minDur) {
        this.endTimeError.set(`La franja debe tener al menos ${minDur} minutos`);
        return;
      }

      this.endTimeError.set(null);
    }
  }

  /**
   * Validates that at least one day is selected for recurring configurations.
   * Also validates that selected days are within the allowed days from the branch schedule.
   */
  validateDays(): void {
    // Check that at least one day is selected
    if (this.recurringDaysOfWeek.length === 0) {
      this.daysError.set('Seleccioná al menos un día');
      return;
    }

    // If there are allowed days defined by the branch, validate that all selected days are allowed
    if (this.allowedDays.length > 0) {
      const invalidDays = this.recurringDaysOfWeek.filter(day => !this.allowedDays.includes(day));

      if (invalidDays.length > 0) {
        const invalidDayNames = invalidDays.map(day => this.getDayName(day)).join(', ');
        const allowedDayNames = this.allowedDays.map(day => this.getDayName(day)).join(', ');
        this.daysError.set(`Días no permitidos: ${invalidDayNames}. Solo se permiten: ${allowedDayNames}`);
        return;
      }
    }

    this.daysError.set(null);
  }

  /**
   * Executed when days of the week change
   */
  onDaysChange(): void {
    this.validateDays();
  }

  /**
   * Gets the Spanish name for a day number (1-7).
   * @param dayNumber - Day number (1=Lunes, 7=Domingo)
   * @returns Spanish day name
   */
  private getDayName(dayNumber: number): string {
    const dayNames: Record<number, string> = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      7: 'Domingo'
    };
    return dayNames[dayNumber] || `Día ${dayNumber}`;
  }

  // ====== Generic form submit ======
  /**
   * Handles form submission from the generic form component.
   * Validates external fields and creates or updates configuration.
   * All configurations are recurring by default.
   * @param v - Form values from GenericForm
   */
  onGenericSubmit(v: any): void {
    this.validateTimes();
    this.validateDays();
    if (this.startTimeError() || this.endTimeError() || this.daysError()) return;

    this.saving.set(true);
    if (this.isEditing()) {
      this.updateConfiguration(v);
    } else {
      this.createConfiguration(v);
    }
  }

  /**
   * Creates a new appointment configuration.
   * All configurations are recurring by default.
   * @param v - Form values
   */
  private createConfiguration(v: any): void {
    const dto: CreateAppointmentConfiguration = {
      branchId: v.branchId,
      startTime: `${this.startTimeExt}:00`,
      endTime: `${this.endTimeExt}:00`,
      appointmentsCount: v.appointmentsCount,
      slotDurationMinutes: v.slotDurationMinutes,
      isRecurring: true,
      recurringDaysOfWeek: [...this.recurringDaysOfWeek].sort((a,b)=>a-b),
      validFromDate: this.formatDate(v.validFromDate),
      validToDate: this.formatDate(v.validToDate),
      createdUser: 1
    };

    this.appointmentService.createConfiguration(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showSuccessAlert('Configuración creada exitosamente');
          setTimeout(() => this.router.navigate(['/appointments-results']), 2000);
        },
        error: (e) => {
          this.handleApiError('Error al crear la configuración', e);
          this.saving.set(false);
        }
      });
  }

  /**
   * Updates an existing appointment configuration.
   * All configurations are recurring by default.
   * @param v - Form values
   */
  private updateConfiguration(v: any): void {
    const cfg = this.currentConfig();
    if (!cfg) return;

    const dto: UpdateAppointmentConfiguration = {
      id: cfg.id,
      branchId: v.branchId,
      startTime: `${this.startTimeExt}:00`,
      endTime: `${this.endTimeExt}:00`,
      appointmentsCount: v.appointmentsCount,
      slotDurationMinutes: v.slotDurationMinutes,
      isRecurring: true,
      recurringDaysOfWeek: [...this.recurringDaysOfWeek].sort((a,b)=>a-b),
      validFromDate: this.formatDate(v.validFromDate),
      validToDate: this.formatDate(v.validToDate),
      lastUpdatedUser: 1,
      version: cfg.version
    };

    this.appointmentService.updateConfiguration(cfg.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showSuccessAlert('Configuración actualizada exitosamente');
          setTimeout(() => this.router.navigate(['/appointments-results']), 2000);
        },
        error: (e) => {
          this.handleApiError('Error al actualizar la configuración', e);
          this.saving.set(false);
        }
      });
  }

  // ====== Active toggle ======
  /**
   * Handles the toggle of active/inactive state for a configuration.
   * @param event - Toggle button change event
   */
  onActiveToggle(event: ToggleButtonChangeEvent): void {
    if (!this.isEditing() || event.checked === undefined) return;

    const cfg = this.currentConfig();
    if (!cfg) return;

    const newValue = event.checked;
    const previousValue = cfg.active;
    this.togglingActive.set(true);

    const userId = 1;
    const onError = (err: any, msg: string) => {
      this.active.set(previousValue);
      this.handleApiError(msg, err);
      this.togglingActive.set(false);
    };

    if (!newValue) {
      this.appointmentService.deactivateConfiguration(cfg.id, userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.info('Configuración desactivada');
            this.currentConfig.set({ ...cfg, active: false });
            this.active.set(false);
            this.togglingActive.set(false);
          },
          error: (e) => onError(e, 'Error al desactivar la configuración')
        });
    } else {
      this.appointmentService.reactivateConfiguration(cfg.id, userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Configuración reactivada');
            this.currentConfig.set({ ...cfg, active: true });
            this.active.set(true);
            this.togglingActive.set(false);
          },
          error: (e) => onError(e, 'Error al reactivar la configuración')
        });
    }
  }

  // ====== Navigation / Helpers ======
  /**
   * Handles cancel action and navigates back to list
   */
  onCancel(): void { this.router.navigate(['/appointments-results']); }

  /**
   * Returns today's date with time set to midnight
   * @returns Date object for today
   */
  private today(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }

  /**
   * Parses a date string in 'yyyy-MM-dd' format to Date object.
   * @param dateString - Date string to parse
   * @returns Parsed Date or null
   */
  private parseDate(dateString: string | null): Date | null {
    if (!dateString) return null;
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  /**
   * Formats a Date object to 'yyyy-MM-dd' string.
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Shows a success alert message.
   * @param message - Success message to display
   */
  private showSuccessAlert(message: string): void {
    this.successTitle.set('Éxito');
    this.successMessage.set(message);
    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 5000);
  }

  /**
   * Handles API errors and displays appropriate error messages.
   * @param context - Error context description
   * @param error - Error object from API
   */
  private handleApiError(context: string, error: unknown): void {
    // eslint-disable-next-line no-console -- Error log for API failure
    console.error(context, error);
    const http = error as HttpErrorResponse;
    let msg = context;
    if (http?.error?.message) msg = http.error.message;
    else if (http?.message) msg = http.message;
    else if (typeof error === 'string') msg = error;

    this.errorTitle.set('Error');
    this.errorMessage.set(msg);
    this.showError.set(true);
    setTimeout(() => this.showError.set(false), 7000);
  }
}
