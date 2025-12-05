import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, computed, effect, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ChipModule } from 'primeng/chip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';

import { LoggerService } from '../../../../core/logger/logger.service';
import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { BranchService } from '../../../care-management/services/branch.service';
import { AppointmentConfiguration, DayOfWeek, DAY_OF_WEEK_LABELS } from '../../models';
import { AppointmentTimePipe } from '../../pipes/appointment-time.pipe';
import { AppointmentConfigurationService } from '../../services/appointment-configuration.service';
import { NotificationService } from '../../services/notification.service';

import { CONFIGURATION_EXPORT_COLUMNS, CONFIGURATION_PDF_COLUMNS, ConfigurationDisplayRow } from './configuration-export-config';

/**
 * Component for displaying and managing appointment configurations list.
 * Provides functionality to view, edit, delete, and toggle configurations.
 *
 * @example
 * ```html
 * <app-configuration-list></app-configuration-list>
 * ```
 */
@Component({
  selector: 'app-configuration-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChipModule,
    ToggleButtonModule,
    AppointmentTimePipe,
    GenericTableComponent,
    GenericBadgeComponent,
    SpinnerComponent,
    ConfirmationModalComponent,
    GenericAlertComponent,
    FormsModule,
    TutorialOverlayComponent
  ],
  templateUrl: './configuration-list.component.html',
  styleUrl: './configuration-list.component.css'
})
export class ConfigurationListComponent implements OnInit, OnDestroy, AfterViewInit {

  /** Dependency injection */
  private readonly appointmentService = inject(AppointmentConfigurationService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly titleService = inject(PageTitleService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly sucursalesService = inject(BranchService);
  private readonly logger = inject(LoggerService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly tutorialService = inject(TutorialService);

  /** Component lifecycle management */
  private readonly destroy$ = new Subject<void>();
  private tutorialSub?: Subscription;

  /** Reactive signals for state management */
  readonly loading = signal<boolean>(false);
  readonly configurations = signal<AppointmentConfiguration[]>([]);
  readonly selectedBranch = signal<number | null>(null);
  readonly branches = signal<any[]>([]);

  /** Error handling signals */
  readonly showError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly errorTitle = signal<string>('Error');

  /**
   * Effect that reacts to branch selection changes and loads configurations
   * Only triggers when a branch is explicitly selected (not null or 0)
   */
  constructor() {
    effect(() => {
      const branch = this.selectedBranch();
      // Only load if a valid branch is selected
      if (branch && branch > 0) {
        this.loadAllConfigurations(branch);
      }
    });
  }

  /**
   * Fetches branches for the selection form.
   */
  private getBranches() {
    this.sucursalesService.getAllBranches({ estado: 'ACTIVE' }, 0, 100, 'description,asc').subscribe({
      next: (response) => {
        this.branches.set(response.content || []);
        // Don't load configurations automatically - user must select a branch first
      },
      error: () => {this.showAlert('error', 'Error al cargar las sucursales.'); }
    });
  }

  // Template references from the view
  @ViewChild('timeTpl') timeTpl!: TemplateRef<any>;
  @ViewChild('capacityTpl') capacityTpl!: TemplateRef<any>;
  @ViewChild('typeTpl') typeTpl!: TemplateRef<any>;
  @ViewChild('periodTpl') periodTpl!: TemplateRef<any>;
  @ViewChild('statusTpl') statusTpl!: TemplateRef<any>;
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  /** Tutorial configuration */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de configuraciones de turnos',
        message: 'Visualiza los horarios, capacidad y días configurados.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar configuraciones por sucursal y refinar tu búsqueda.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar configuraciones de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de configuraciones a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nueva configuración',
        message: 'Haz clic aquí para crear una nueva configuración de turnos.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada configuración.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes editar la configuración o eliminarla del sistema.',
        position: 'left',
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
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.showAlert('success', 'Tutorial completado! Ya conoces todas las funcionalidades de gestión de configuraciones de turnos.');
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
    }
  });

  /** Reference to GenericTable component to access filtered data */
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;

  /** Generic table configuration */
  tableColumns: any[] = [];

  /** Confirmation modal state */
  readonly showDeleteModal = signal<boolean>(false);
  readonly configToDelete = signal<AppointmentConfiguration | null>(null);

  /**
   * Computed: filters for app-filter integrated in the table
   */
  readonly branchFilters = computed<Filter[]>(() => {
    const branchList = this.branches();
    return [
      {
        id: 'branch',
        label: 'Sucursal',
        type: 'select',
        options: [
          ...branchList.map(b => ({
            label: b.description,
            value: b.id,
            active: this.selectedBranch() === b.id
          }))
        ]
      }
    ];
  });

  /**
   * Gets actions for each row in the table
   * @param row - Table row data
   * @returns Array of actions
   */
  getActions = (row: any) => [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.onEditConfiguration(row)
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => this.confirmDelete(row)
    }
  ];

  readonly filteredConfigurations = computed(() => {
    // Simply return configurations - filtering is handled by the effect
    return this.configurations();
  });

  /** Rows enriched with label fields for filtering and display */
  readonly displayRows = computed(() => {
    const rows = this.filteredConfigurations()
      .map(c => {
      // Normalize recurringDaysOfWeek to array of numbers (type safe)
        let daysArr: number[] = [];
        if (Array.isArray(c.recurringDaysOfWeek)) {
          daysArr = c.recurringDaysOfWeek;
        } else if (typeof c.recurringDaysOfWeek === 'string') {
          daysArr = (c.recurringDaysOfWeek as string)
            .split(',')
            .map((x: string) => Number(x.trim()))
            .filter((x: number) => !isNaN(x));
        }
        return {
          id: c.id,
          branchId: c.branchId,
          startTime: c.startTime.substring(0, 5),
          endTime: c.endTime.substring(0, 5),
          timeRange: `${c.startTime.substring(0, 5)} - ${c.endTime.substring(0, 5)}`,
          appointmentsCount: c.appointmentsCount,
          slotDurationMinutes: c.slotDurationMinutes,
          isRecurring: c.isRecurring,
          recurringDaysOfWeek: daysArr,
          validFromDate: c.validFromDate,
          validToDate: c.validToDate,
          active: c.active,
          version: c.version,
          createdDatetime: c.createdDatetime,
          lastUpdatedDatetime: c.lastUpdatedDatetime,
          createdUser: c.createdUser,
          lastUpdatedUser: c.lastUpdatedUser,
          inactive: c.inactive,
          isRecurringLabel: c.isRecurring ? 'Recurrente' : 'Específico',
          activeLabel: c.active ? 'Activo' : 'Desactivado',
          dayOfWeekLabel: c.isRecurring && daysArr.length > 0
            ? daysArr.map(day => DAY_OF_WEEK_LABELS[day as DayOfWeek] || day).join(', ')
            : '-',
          periodLabel: `${this.formatAsDDMMYYYY(c.validFromDate)} - ${this.formatAsDDMMYYYY(c.validToDate)}`
        };
      });

    // Sort by createdDatetime descending (most recent first)
    return rows.sort((a, b) => {
      const dateA = new Date(a.createdDatetime).getTime();
      const dateB = new Date(b.createdDatetime).getTime();
      return dateB - dateA; // Descending order
    });
  });

  /** Formats 'yyyy-MM-dd' or Date to 'dd/MM/yyyy' */
  private formatAsDDMMYYYY(value: string | Date): string {
    if (!value) return '';
    let d: Date;
    if (value instanceof Date) {
      d = value;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, day] = value.split('-').map(Number);
      d = new Date(y, (m || 1) - 1, day || 1);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      // already in dd/MM/yyyy format
      return value;
    } else {
      // fallback: try to parse
      d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${MM}/${yyyy}`;
  }

  /**
   * Component initialization.
   * Sets up form subscriptions and loads initial data.
   */
  ngOnInit(): void {
    this.getBranches();
    this.loadUserBranch(); // Precargar branch del usuario logueado
    this.titleService.setTitle('Turnos');
    // Configure breadcrumbs: Turnos > Configuraciones
    this.breadcrumbService.setFromString('Gestión de turnos > Configuraciones', '/appointments-results/configuration');

    // Subscribe to tutorial triggers
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('appointments')) {
        return;
      }
      this.startTutorial();
    });
  }

  /**
   * Starts the tutorial.
   */
  private startTutorial(): void {
    setTimeout(() => {
      this.tutorialOverlay?.start();
    }, 500);
  }

  /**
   * Loads the user's branch from localStorage and sets it as the initial filter value
   */
  private loadUserBranch(): void {
    try {
      const authUserStr = localStorage.getItem('auth_user');
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        if (authUser.branch) {
          this.selectedBranch.set(authUser.branch);
        }
      }
    } catch (error) {
      this.logger.error('Error al cargar branch del usuario desde localStorage', 'ConfigurationListComponent', error);
    }
  }

  /** After view init, wire up templates into columns */
  ngAfterViewInit(): void {
    // Initialize table columns with templates
    this.tableColumns = [
      { field: 'dayOfWeekLabel', header: 'Días', sortable: true },
      { field: 'timeRange', header: 'Horario', template: this.timeTpl, sortable: true },
      { field: 'appointmentsCount', header: 'Capacidad', template: this.capacityTpl, sortable: true },
      { field: 'slotDurationMinutes', header: 'Duración (min)', sortable: true },
      { field: 'isRecurringLabel', header: 'Tipo', template: this.typeTpl, sortable: true },
      { field: 'periodLabel', header: 'Período', template: this.periodTpl, sortable: true },
      { field: 'activeLabel', header: 'Estado', template: this.statusTpl, sortable: false }
    ];
  }

  /**
   * Component cleanup.
   * Unsubscribes from all active subscriptions.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Loads all configurations for a given branch.
   * @param branchId The ID of the branch for which to load configurations.
   */
  private loadAllConfigurations(branchId: number): void {
    this.loading.set(true);

    // Load configurations for the given branch ID
    this.appointmentService.getConfigurationsByBranch(branchId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configs) => {
          this.configurations.set(configs);
          this.loading.set(false);
        },
        error: () => {
          this.showAlert('error', 'Error al cargar las configuraciones.');
          this.loading.set(false);
        }
      });
  }

  /**
   * Handles branch filter changes
   */
  onFilterChange(event: FilterChangeEvent): void {
    const branchFilter = event.filters.find(f => f.id === 'branch');
    const branchId = branchFilter?.value as number | null;
    this.selectedBranch.set(branchId);
  }

  /**
   * Handles creation from the generic table button
   */
  onCreate(): void {
    const branchId = this.selectedBranch();

    // Clear selected configuration before navigating to creation form
    this.appointmentService.setSelectedConfiguration(null);

    if (branchId) {
      this.appointmentService.setSelectedBranch(branchId);
    }

    this.router.navigate(['/appointments-results/configuration/new']);
  }

  /**
   * Displays a temporary alert on the screen.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** Handle edit action */
  onEditConfiguration(config: AppointmentConfiguration): void {
    // Save context in case user navigates back
    this.appointmentService.setSelectedConfiguration(config);
    this.appointmentService.setSelectedBranch(config.branchId);
    // Navigate with :id to allow direct reloads and enable toggle in edit mode
    this.router.navigate(['/appointments-results/configuration/edit', config.id]);
  }

  /**
   * Shows delete confirmation modal
   */
  confirmDelete(config: AppointmentConfiguration): void {
    this.configToDelete.set(config);
    this.showDeleteModal.set(true);
  }

  /**
   * Handles delete confirmation
   */
  onDeleteConfirmed(): void {
    const config = this.configToDelete();
    if (!config) return;

    this.onDeleteConfiguration(config);
    this.showDeleteModal.set(false);
    this.configToDelete.set(null);
  }

  /**
   * Handles delete cancellation
   */
  onDeleteCancelled(): void {
    this.showDeleteModal.set(false);
    this.configToDelete.set(null);
  }

  /**
   * Deletes a configuration (deactivates it via DELETE endpoint)
   */
  private onDeleteConfiguration(config: AppointmentConfiguration): void {
    this.loading.set(true);

    // userId hardcoded as 1 for now - should come from auth service in production
    const userId = 1;

    this.appointmentService.deactivateConfiguration(config.id, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove from local state
          const currentConfigs = this.configurations();
          this.configurations.set(currentConfigs.filter(c => c.id !== config.id));
          this.loading.set(false);
        },
        error: (error: any) => {
          this.handleError('Error al eliminar la configuración', error);
          this.loading.set(false);
        }
      });
  }

  /**
   * Shows a success message to the user.
   * @param message - Message to display
   * @private
   */
  private showSuccessMessage(message: string): void {
    this.notificationService.success(message);
  }

  /**
   * Handles and displays error messages.
   * @param message - Error context message
   * @param error - The error object
   * @private
   */
  private handleError(message: string, error: unknown): void {
    this.logger.error(message, 'ConfigurationListComponent', error);

    let errorMessage = message;

    // Extract error message if available
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as any;
      if (httpError?.error?.message) {
        errorMessage = httpError.error.message;
      } else if (httpError?.message) {
        errorMessage = httpError.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.errorTitle.set('Error');
    this.errorMessage.set(errorMessage);
    this.showError.set(true);

    // Auto-hide after 7 seconds
    setTimeout(() => this.showError.set(false), 7000);
  }

  /**
   * Get filtered data for export (from GenericTable's internal filtered data)
   */
  private getFilteredDataForExport(): ConfigurationDisplayRow[] {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as ConfigurationDisplayRow[];
    }
    // Fallback to display rows if table not available
    return this.displayRows();
  }

  /**
   * Export configurations to Excel
   */
  async onExportExcel(): Promise<void> {
    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: CONFIGURATION_EXPORT_COLUMNS,
        fileName: 'configuraciones-turnos',
        sheetName: 'Configuraciones',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('success', 'Las configuraciones se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Export configurations to PDF
   */
  async onExportPdf(): Promise<void> {
    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: CONFIGURATION_PDF_COLUMNS,
        fileName: 'configuraciones-turnos',
        title: 'Configuraciones de Turnos',
        orientation: 'landscape',
        includeDate: true,
        includeTimestamp: true,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 230,
          y: 8
        }
      });

      if (result.success) {
        this.showAlert('success', 'Las configuraciones se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    }
  }
}
