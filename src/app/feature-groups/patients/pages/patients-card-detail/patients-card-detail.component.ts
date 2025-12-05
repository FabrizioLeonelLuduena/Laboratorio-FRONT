import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonDirective } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { Ripple } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { catchError, map, of } from 'rxjs';

import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent as GenericTutorialComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import {
  computeAgeDetail,
  mapPatientStatusToBadge as mapPatientStatusToBadgeUtil
} from '../../../../shared/utils/patient-data-helpers.util';
import { PatientAttentionResponse } from '../../models/PatientModel';
import { AppointmentPatientService } from '../../services/appointmentPatient.service';
import { DoctorPatientService } from '../../services/doctorPatient.service';
import { PatientService } from '../../services/PatientService';
import { PostAnalyticalServiceService } from '../../services/post-analytical-service.service';

/**
 * Patient detail card component for viewing comprehensive patient information in read-only mode.
 *
 * @description
 * This component displays complete patient information including:
 * - Personal data (name, document, birth date, gender, contact information)
 * - Addresses with distinction between primary and secondary
 * - Medical coverages organized by priority
 * - Complete attention history with protocol and payment details
 * - Interactive tutorial system to guide users
 *
 * @features
 * - Timezone-safe date formatting to prevent date shifting issues
 * - Responsive 2-column grid layout for coverages/addresses
 * - Contact information (phone/email) integrated in personal data section
 * - Visual distinction between primary and secondary items
 * - PrimeNG components integration (Card, Tag, Spinner, Divider)
 * - OnPush change detection strategy for performance optimization
 * - Tab system for navigating between general view and analysis
 * - Expandable table with protocol, payment and analysis details
 * - Doctor information caching to avoid duplicate requests
 * - PDF report and prescription download capabilities
 * - Filter system for attention history
 *
 * @responsibilities
 * - Load and display complete patient information by ID from route params
 * - Show personal data including phone and email
 * - Categorize items into primary and secondary for coverages and addresses
 * - Format dates and addresses for user-friendly display
 * - Handle loading, error, and success states
 * - Process and visualize attention history with detail expansion
 * - Resolve and cache doctor names associated with attentions
 * - Manage tab navigation and data filtering
 * - Control interactive tutorial and row expansion/collapse
 *
 * @example
 * ```typescript
 * // Usage in routing
 * {
 *   path: 'patients/detail/:id',
 *   component: PatientsCardDetailComponent
 * }
 * ```
 *
 * @implements {OnInit} Component initialization and patient data loading
 * @implements {AfterViewInit} Column template initialization after view init
 * @implements {OnDestroy} Subscription cleanup on component destruction
 */
@Component({
  selector: 'app-patients-card-detail',
  imports: [
    CommonModule,
    CardModule,
    DividerModule,
    TagModule,
    GenericButtonComponent,
    SpinnerComponent,
    GenericBadgeComponent,
    TooltipModule,
    GenericTableComponent,
    GenericTutorialComponent,
    ButtonDirective,
    Ripple
  ],
  templateUrl: './patients-card-detail.component.html',
  styleUrls: ['./patients-card-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsCardDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Current patient data loaded from API.
   * Contains complete patient information including attentions, coverages and addresses.
   * @type {PatientAttentionResponse | null}
   */
  patient: PatientAttentionResponse | null = null;

  /**
   * Readable age label computed from birth date.
   * Automatically updated when patient is loaded.
   * @type {string | null}
   * @example "25 years" | "3 months" | "2 days"
   */
  patientAgeLabel: string | null = null;

  /**
   * Loading state flag - true while fetching patient data.
   * @type {boolean}
   */
  loading: boolean = true;

  /**
   * Error message to display if patient load fails.
   * @type {string | null}
   */
  error: string | null = null;

  /**
   * Current active tab in the interface.
   * @type {'general' | 'analysis'}
   * @default 'general'
   */
  activeTab: 'general' | 'analysis' = 'general';

  /**
   * Expanded rows control for table - Angular implementation without DOM manipulation.
   * Object with row IDs as keys and expansion state as values.
   * @type {Object.<string, boolean>}
   * @example { '123': true, '456': false }
   */
  expandedRowKeys: { [key: string]: boolean } = {};

  /**
   * Reference to the tutorial overlay component.
   * Used to programmatically control tutorial initialization.
   * @type {GenericTutorialComponent | undefined}
   */
  @ViewChild('tutorialOverlay') tutorialOverlay?: GenericTutorialComponent;

  /**
   * Reference to the download action template.
   * Used to render download buttons in the attentions table.
   * @type {TemplateRef<any>}
   */
  @ViewChild('downloadActionTpl', { static: false }) downloadActionTpl!: TemplateRef<any>;

  /**
   * Reference to the attention status template.
   * Used to render status badges in the attentions table.
   * @type {TemplateRef<any>}
   */
  @ViewChild('atentionStatusTpl', { static: false }) atentionStatusTpl!: TemplateRef<any>;

  /**
   * Reference to the analysis status template.
   * Used to render status badges in the nested analysis table.
   * @type {TemplateRef<any>}
   */
  @ViewChild('analysisStatusTpl', { static: false }) analysisStatusTpl!: TemplateRef<any>;

  /**
   * Reference to the generic table component.
   * Used to programmatically scroll to the table during tutorial.
   * @type {GenericTableComponent | undefined}
   */
  @ViewChild(GenericTableComponent) genericTableComponent?: GenericTableComponent;

  /**
   * Expands the first row of the table programmatically.
   * Uses Angular's expansion key system without direct DOM manipulation.
   * @private
   * @returns {void}
   */
  private expandFirstRow(): void {
    if (this.atentionData && this.atentionData.length > 0) {
      const firstRowId = this.atentionData[0].id;
      this.expandedRowKeys = { [firstRowId]: true };
      this.cdr.markForCheck();
    }
  }

  /**
   * Collapses the first row of the table programmatically.
   * @private
   * @returns {void}
   */
  private collapseFirstRow(): void {
    if (this.atentionData && this.atentionData.length > 0) {
      const firstRowId = this.atentionData[0].id;
      this.expandedRowKeys = { [firstRowId]: false };
      this.cdr.markForCheck();
    }
  }

  /**
   * Checks if the first row is expanded.
   * @private
   * @returns {boolean} True if the first row is expanded, false otherwise
   */
  private isFirstRowExpanded(): boolean {
    if (this.atentionData && this.atentionData.length > 0) {
      const firstRowId = this.atentionData[0].id;
      return !!this.expandedRowKeys[firstRowId];
    }
    return false;
  }

  /**
   * Collapses all expanded rows.
   * @private
   * @returns {void}
   */
  private collapseAllRows(): void {
    this.expandedRowKeys = {};
    this.cdr.markForCheck();
  }

  /**
   * Signal containing tutorial configuration without DOM manipulation.
   * Defines tutorial steps with targets, messages, and lifecycle hooks.
   * @type {WritableSignal<TutorialConfig>}
   */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: '.card-header',
        title: 'Información Principal',
        message: 'El encabezado muestra el nombre completo, documento, edad y el estado de verificación del paciente.',
        position: 'bottom',
        highlightPadding: 10,
        onEnter: () => this.setActiveTab('general')
      },
      {
        target: '.tabs-navigation',
        title: 'Navegación por Pestañas',
        message: 'Usa estas pestañas para cambiar entre la "Vista general" y el historial de "Análisis".',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: '.info-section',
        title: 'Información Personal',
        message: 'Esta sección contiene los datos personales del paciente como fecha de nacimiento, género, estado y datos de contacto.',
        position: 'top',
        highlightPadding: 10
      },
      {
        target: '.sections-grid',
        title: 'Coberturas y Direcciones',
        message: 'Aquí se muestran las coberturas médicas y las direcciones del paciente, destacando las principales.',
        position: 'top',
        highlightPadding: 10,
        onEnter: () => this.setActiveTab('general')
      },
      {
        target: '#analysis-tab',
        title: 'Historial de Análisis',
        message: 'Haz clic aquí para ver un historial de todas las atenciones y análisis realizados al paciente.',
        position: 'bottom',
        highlightPadding: 10,
        onEnter: () => this.setActiveTab('analysis')
      },
      {
        target: 'app-generic-table',
        title: 'Tabla de Atenciones',
        message: 'Esta tabla muestra un listado de todas las atenciones. Puedes expandir cada fila para ver más detalles.',
        position: 'top',
        highlightPadding: 10,
        onEnter: () => {
          this.scrollToTable();
        }
      },
      {
        target: '.p-datatable-tbody tr:first-child button.p-button-rounded.p-button-text',
        title: 'Ver Detalles de Atención',
        message: 'Haz clic en este ícono para expandir la fila y ver los detalles del protocolo y del pago asociado a la atención.',
        position: 'right',
        highlightPadding: 10,
        onEnter: () => {
          if (this.isFirstRowExpanded()) {
            this.collapseFirstRow();
          }
        }
      },
      {
        target: '.expanded-row-wrapper .protocol-section',
        title: 'Detalles Expandidos',
        message: 'Aquí puedes ver información detallada sobre el protocolo, el pago y una lista de los análisis específicos realizados.',
        position: 'top',
        highlightPadding: 10,
        onEnter: () => {
          if (!this.isFirstRowExpanded()) {
            this.expandFirstRow();
          }
          return new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    ],
    onComplete: () => {
      this.collapseAllRows();
      this.setActiveTab('general');
    },
    onSkip: () => {
      this.collapseAllRows();
      this.setActiveTab('general');
    }
  });

  /**
   * Helper method to safely scroll to the table element.
   * Uses setTimeout to ensure DOM is ready before scrolling.
   * @private
   * @returns {void}
   */
  /**
   * Helper method to safely scroll to the table element.
   * Uses ViewChild reference instead of DOM manipulation.
   * @private
   * @returns {void}
   */
  private scrollToTable(): void {
    setTimeout(() => {
      if (this.genericTableComponent) {
        const element = (this.genericTableComponent as any).el?.nativeElement ||
          document.querySelector('app-generic-table');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  }

  /**
   * Subscription to the global TutorialService trigger stream.
   * Automatically starts tutorial when triggered for this route.
   * @private
   * @type {Subscription | undefined}
   */
  private tutorialSub?: Subscription;

  /**
   * Map of column templates for custom rendering in attentions table.
   * Initialized as empty map and populated in ngAfterViewInit.
   * @type {Map<string, TemplateRef<any>>}
   */
  actionsColumnTemplateMap: Map<string, TemplateRef<any>> = new Map();

  /**
   * Map of column templates for custom rendering in analysis table.
   * @type {Map<string, TemplateRef<any>>}
   */
  analysisColumnTemplateMap: Map<string, TemplateRef<any>> = new Map();

  /**
   * Cache for doctor names resolved from doctorId.
   * Prevents duplicate API requests for the same doctor.
   * @private
   * @type {Map<number, string>}
   */
  private doctorInfoMap = new Map<number, string>();

  /**
   * Track doctorIds being fetched to avoid duplicate requests.
   * @private
   * @type {Set<number>}
   */
  private pendingDoctorRequests = new Set<number>();

  /**
   * Columns configuration for attention table.
   * Defines field mapping, headers, and column widths.
   * @type {Array<{field: string, header: string, width?: string}>}
   */
  atentionColumns: any[] = [
    { field: 'attentionNumber', header: 'N° Atención' },
    { field: 'admissionDate', header: 'Fecha de admisión' },
    { field: 'coverage', header: 'Cobertura' },
    { field: 'statusBadge', header: 'Estado' },
    { field: 'actions', header: 'Estudio', width: '100px' }
  ];

  /**
   * Columns configuration for nested protocol analyses table.
   * @type {Array<{field: string, header: string}>}
   */
  protocolAnalysisColumns: any[] = [
    { field: 'name', header: 'Nombre' },
    { field: 'subStatusText', header: 'Subestado' }
  ];

  /**
   * Processed attention data for table display.
   * Contains formatted and enriched data ready for rendering.
   * @type {Array<any>}
   */
  atentionData: any[] = [];

  /**
   * Full attention data (unfiltered) to apply client-side filters.
   * Serves as source of truth for filtering operations.
   * @private
   * @type {Array<any>}
   */
  private allAtentionData: any[] = [];

  /**
   * Filters configuration for attention tab.
   * Defines available filter options including status select dropdown.
   * @type {Filter[]}
   */
  atentionFilters: Filter[] = [
    {
      id: 'atentionStatus',
      label: 'Estado de Atención',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Registrando datos generales', value: 'REGISTERING_GENERAL_DATA' },
        { label: 'Registrando análisis', value: 'REGISTERING_ANALYSES' },
        { label: 'En proceso de toma de muestras', value: 'ON_COLLECTION_PROCESS' },
        { label: 'En proceso de facturación', value: 'ON_BILLING_PROCESS' },
        { label: 'En espera de confirmación', value: 'AWAITING_CONFIRMATION' },
        { label: 'En espera de extracción', value: 'AWAITING_EXTRACTION' },
        { label: 'En extracción', value: 'IN_EXTRACTION' },
        { label: 'Completada', value: 'FINISHED' },
        { label: 'Cancelado', value: 'CANCELED' },
        { label: 'Fallido', value: 'FAILED' }
      ]
    }
  ];

  /**
   * Formats a LocalDateTime string (with 'T' or space) to es-AR date/time format.
   * Handles both ISO format and space-separated format.
   * @private
   * @param {string | null | undefined} value - Date string to format
   * @returns {string} Formatted date/time string or "-" if invalid
   * @example
   * formatLocalDateTime('2024-01-15T10:30:00') // "15/01/2024 10:30"
   */
  private formatLocalDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    try {
      const normalized = value.includes('T') ? value : value.replace(' ', 'T');
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  }

  /**
   * Formats a numeric value as currency in Argentine pesos.
   * @param {number | null | undefined} value - Numeric amount to format
   * @returns {string} Formatted currency string (e.g., "$1.234,56") or "-" if null/undefined
   * @example
   * formatCurrency(1234.56) // "$1.234,56"
   */
  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Spanish labels for attention statuses.
   * Maps backend enum values to user-friendly Spanish labels.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly atentionStatusLabel: Record<string, string> = {
    REGISTERING_GENERAL_DATA: 'Registrando datos generales',
    REGISTERING_ANALYSES: 'Registrando análisis',
    ON_COLLECTION_PROCESS: 'En proceso de toma de muestras',
    ON_BILLING_PROCESS: 'En proceso de facturación',
    AWAITING_CONFIRMATION: 'En espera de confirmación',
    AWAITING_EXTRACTION: 'En espera de extracción',
    IN_EXTRACTION: 'En extracción',
    FINISHED: 'COMPLETADA',
    CANCELED: 'CANCELADA',
    FAILED: 'Fallido'
  };

  /**
   * Spanish labels for protocol statuses.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly protocolStatusLabel: Record<string, string> = {
    CREATED: 'CREADO',
    READY_TO_SAMPLES_COLLECTION: 'LISTO PARA TOMA DE MUESTRAS',
    SAMPLES_COLLECTED: 'MUESTRAS RECOLECTADAS',
    PRE_ANALYTICAL: 'PRE-ANALÍTICO',
    ANALYTICAL: 'ANALÍTICO',
    POST_ANALYTICAL: 'POST-ANALÍTICO',
    DELIVERED: 'ENTREGADO',
    CANCELED: 'CANCELADO'
  };

  /**
   * Spanish labels for payment statuses.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly paymentStatusLabel: Record<string, string> = {
    CREATED: 'CREADO',
    PROCESSED: 'PROCESADO',
    CANCELLED: 'CANCELADO',
    REFUNDED: 'REEMBOLSADO'
  };

  /**
   * Spanish labels for payment messages.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly paymentMessageLabel: Record<string, string> = {
    'Payment retrieved successfully': 'Pago recuperado exitosamente',
    'Payment created successfully': 'Pago creado exitosamente',
    'Payment processed successfully': 'Pago procesado exitosamente',
    'Payment cancelled successfully': 'Pago cancelado exitosamente',
    'Payment refunded successfully': 'Pago reembolsado exitosamente',
    'Payment failed': 'Pago fallido',
    'Payment pending': 'Pago pendiente',
    'Insufficient funds': 'Fondos insuficientes',
    'Payment declined': 'Pago rechazado',
    'Payment error': 'Error en el pago'
  };

  /**
   * States handled by extractor team.
   * Used for badge styling and team assignment logic.
   * @private
   * @readonly
   * @type {Set<string>}
   */
  private readonly extractorStates = new Set([
    'REGISTERING_ANALYSES',
    'ON_COLLECTION_PROCESS',
    'AWAITING_EXTRACTION',
    'IN_EXTRACTION'
  ]);

  /**
   * States handled by secretary team.
   * @private
   * @readonly
   * @type {Set<string>}
   */
  private readonly secretaryStates = new Set([
    'ON_COLLECTION_PROCESS',
    'ON_BILLING_PROCESS',
    'REGISTERING_GENERAL_DATA'
  ]);

  /**
   * Protocol statuses considered "in progress" for badge coloring.
   * @private
   * @readonly
   * @type {Set<string>}
   */
  private readonly protocolInProgressStatuses = new Set([
    'READY_TO_SAMPLES_COLLECTION',
    'SAMPLES_COLLECTED',
    'PRE_ANALYTICAL',
    'ANALYTICAL'
  ]);

  /**
   * Payment statuses shown as active (green badge).
   * @private
   * @readonly
   * @type {Set<string>}
   */
  private readonly paymentActiveStatuses = new Set([
    'PROCESSED',
    'CREATED'
  ]);

  /**
   * Payment statuses shown as inactive (red badge).
   * @private
   * @readonly
   * @type {Set<string>}
   */
  private readonly paymentInactiveStatuses = new Set([
    'CANCELLED',
    'REFUNDED'
  ]);

  /**
   * Status labels mapping for patient verification status.
   * Maps backend enum values to user-friendly Spanish labels.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly statusLabel: Record<string, string> = {
    MIN: 'Mínimo',
    COMPLETE: 'Completo',
    VERIFIED: 'Verificado',
    DEACTIVATED: 'Desactivado'
  };

  /**
   * Shared utility function for mapping patient status to badge configuration.
   * Exposed to template for consistent badge rendering.
   * @readonly
   */
  readonly mapPatientStatusToBadge = mapPatientStatusToBadgeUtil;

  /**
   * Gender labels mapping for patient gender identity.
   * Maps backend enum values to Spanish labels.
   * @readonly
   * @type {Record<string, string>}
   */
  readonly genderLabel: Record<string, string> = {
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro'
  };

  /**
   * Dependency injection constructor.
   * Injects required services for patient data management, routing, and UI control.
   *
   * @param {PatientService} patientService - Service for patient data operations
   * @param {ActivatedRoute} route - Current active route for parameter extraction
   * @param {Router} router - Router for navigation operations
   * @param {ChangeDetectorRef} cdr - Change detector for manual change detection
   * @param {PostAnalyticalServiceService} postAnalyticalService - Service for report downloads
   * @param {TutorialService} tutorialService - Service for tutorial management
   * @param {BreadcrumbService} breadcrumbService - Service for breadcrumb navigation
   * @param {AppointmentPatientService} appointmentPatientService - Service for appointment operations
   * @param {DoctorPatientService} doctorPatientService - Service for doctor data operations
   */
  constructor(
    private patientService: PatientService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private postAnalyticalService: PostAnalyticalServiceService,
    private tutorialService: TutorialService,
    private breadcrumbService: BreadcrumbService,
    private appointmentPatientService: AppointmentPatientService,
    private doctorPatientService: DoctorPatientService
  ) {
  }

  /**
   * Angular lifecycle hook - component initialization.
   * Extracts patient ID from route params and initiates data loading.
   * Subscribes to tutorial service for automatic tutorial triggering.
   * @returns {void}
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadPatient(Number(id));
    } else {
      this.error = 'ID de paciente no válido';
      this.loading = false;
      this.cdr.markForCheck();
    }

    this.breadcrumbService.buildFromRoute(this.route);

    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('patients/detail')) {
        return;
      }

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });
  }

  /**
   * Angular lifecycle hook - component destruction.
   * Unsubscribes from tutorial service to prevent memory leaks.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Angular lifecycle hook - after view initialization.
   * Initializes column template maps after view children are available.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    this.initializeTemplateMap();
    this.cdr.detectChanges();
  }

  /**
   * Loads patient data from service by ID.
   * Sets loading state, fetches data, processes attentions, and handles errors.
   * @private
   * @param {number} id - Patient ID to load
   * @returns {void}
   */
  private loadPatient(id: number): void {
    this.loading = true;
    this.error = null;
    this.patientAgeLabel = null;

    this.patientService.getPatientWithProtocolById(id).subscribe({
      next: (patient) => {
        this.patient = patient;
        this.updatePatientAgeLabel();
        this.doctorInfoMap.clear();
        this.processAtentionData();
        this.loading = false;
        this.initializeTemplateMap();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar los datos del paciente';
        this.loading = false;
        this.patientAgeLabel = null;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Computes and stores the patient age text using shared helper logic.
   * Updates patientAgeLabel with a human-readable age string.
   * @private
   * @returns {void}
   */
  private updatePatientAgeLabel(): void {
    const ageDetail = computeAgeDetail(this.patient?.birthDate ?? null);
    this.patientAgeLabel = ageDetail.label;
  }

  /**
   * Initializes the column template map for custom cell rendering.
   * Maps template references to column field names for both attention and analysis tables.
   * @private
   * @returns {void}
   */
  private initializeTemplateMap(): void {
    const newMap = new Map<string, TemplateRef<any>>();
    if (this.downloadActionTpl) {
      newMap.set('actions', this.downloadActionTpl);
    }
    if (this.atentionStatusTpl) {
      newMap.set('statusBadge', this.atentionStatusTpl);
    }
    if (newMap.size > 0) {
      this.actionsColumnTemplateMap = newMap;
    }

    if (this.analysisStatusTpl) {
      const analysisMap = new Map<string, TemplateRef<any>>();
      analysisMap.set('subStatusText', this.analysisStatusTpl);
      this.analysisColumnTemplateMap = analysisMap;
    }
  }

  /**
   * Processes attention data for table display.
   * Transforms raw attention data into formatted rows with badge metadata,
   * doctor information, protocol details, and payment information.
   * @private
   * @returns {void}
   */
  private processAtentionData(): void {
    const primaryCoverage = this.getPrimaryCoverage();
    const coverageLabel = primaryCoverage
      ? `${primaryCoverage.insurerName}${primaryCoverage.planName ? ' - ' + primaryCoverage.planName : ''}`
      : '-';
    const appointmentIds = this.patient?.appointmentIds ?? [];
    const hasAppointmentId = appointmentIds.length > 0;
    const appointmentId = hasAppointmentId ? appointmentIds[0] : null;

    const attentions = this.patient?.attentions ?? [];
    const mapped = attentions.map((att) => {
      const proto = att.protocol ?? null;
      const payment = (att as any).payment ?? att.paymentDto ?? null;
      const protocolBadge = this.getProtocolStatusBadgeMeta(proto?.status ?? null);
      const paymentBadge = this.getPaymentStatusBadgeMeta(payment?.status ?? null);
      const badgeMeta = this.resolveAtentionBadgeMeta(att.attentionState);

      return {
        id: att.attentionId,
        attentionNumber: att.attentionNumber,
        admissionDate: this.formatLocalDateTime(att.admissionDate),
        coverage: coverageLabel,
        status: att.attentionState,
        doctorId: att.doctorId ?? null,
        doctorName: this.resolveDoctorName(att.doctorId),
        statusBadge: this.getAtentionStatusLabel(att.attentionState),
        statusBadgeStyle: badgeMeta.status,
        statusBadgeText: badgeMeta.text,
        protocolId: att.protocolId ?? null,
        protocolStatus: proto?.status ?? null,
        protocolStatusBadgeStyle: protocolBadge.status,
        protocolStatusBadgeText: protocolBadge.text,
        analysesRows: Array.isArray(proto?.analyses)
          ? proto!.analyses.map((a: any) => {
            const subStatus = a?.sub_status ?? a?.subStatus ?? null;
            const badgeMeta = this.getProtocolAnalysisBadgeMeta(subStatus);
            return {
              name: a.name,
              sub_status: subStatus,
              subStatusText: this.getAnalysisSubStatusLabel(subStatus),
              subStatusBadgeStyle: badgeMeta.status,
              subStatusBadgeText: badgeMeta.text
            };
          })
          : [],
        paymentStatus: payment?.status ?? null,
        paymentMessage: payment?.message ?? null,
        paymentCopayment: payment?.copayment ?? null,
        paymentIva: payment?.iva ?? null,
        paymentDate: this.formatLocalDateTime(payment?.payment_date ?? payment?.paymentDate ?? null),
        paymentStatusBadgeStyle: paymentBadge.status,
        paymentStatusBadgeText: paymentBadge.text,
        studyId: proto?.protocolId ?? null,
        appointmentId,
        hasAppointmentId
      };
    });

    this.allAtentionData = mapped;
    this.atentionData = [...mapped];
  }

  /**
   * Returns Spanish label for protocol analysis sub-status.
   * Handles various sub-status values and provides fallback formatting.
   * @private
   * @param {string | null | undefined} value - Sub-status value to translate
   * @returns {string} Spanish label or formatted fallback
   */
  private getAnalysisSubStatusLabel(value: string | null | undefined): string {
    if (!value) return '-';
    const map: Record<string, string> = {
      READY_TO_SAMPLE_COLLECTION: 'LISTO PARA TOMA DE MUESTRA',
      SAMPLE_PREPARED: 'MUESTRA PREPARADA',
      SAMPLE_CHECKED_IN: 'MUESTRA RECEPCIONADA',
      MANUAL_MEASUREMENT_IN_PROGRESS: 'MEDICIÓN MANUAL EN PROGRESO',
      AUTOMATED_MEASUREMENT_IN_PROGRESS: 'MEDICIÓN AUTOMATIZADA EN PROGRESO',
      LOADED_RESULTS: 'RESULTADOS CARGADOS',
      MEASUREMENT_MANUAL_REVIEW: 'REVISIÓN MANUAL DE MEDICIÓN',
      MEASUREMENT_AUTOMATED_REVIEW: 'REVISIÓN AUTOMATIZADA DE MEDICIÓN',
      MEASUREMENT_TECHNICAL_REVIEW: 'REVISIION TÉCNICA DE MEDICIÓN',
      RESULTS_VALIDATED: 'RESULTADOS VALIDADOS',
      RESULTS_DELIVERED: 'RESULTADOS ENTREGADOS',
      CANCELED: 'CANCELADO'
    };
    const key = String(value).toUpperCase();
    if (map[key]) return map[key];
    return key
      .toLowerCase()
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Gets protocol status badge metadata for styling.
   * Determines badge style (activo/inactivo/pendiente) and display text.
   * @private
   * @param {string | null | undefined} status - Protocol status value
   * @returns {{status: 'activo' | 'inactivo' | 'pendiente', text: string}} Badge configuration
   */
  private getProtocolStatusBadgeMeta(status: string | null | undefined): { status: 'activo' | 'inactivo' | 'pendiente'; text: string } {
    if (!status) {
      return { status: 'pendiente', text: '-' };
    }

    const normalized = status.toUpperCase();
    const label = this.protocolStatusLabel[normalized] || status;

    if (this.protocolInProgressStatuses.has(normalized)) {
      return { status: 'pendiente', text: label };
    }

    if (normalized === 'CREATED' || normalized === 'DELIVERED') {
      return { status: 'activo', text: label };
    }

    if (normalized === 'CANCELED') {
      return { status: 'inactivo', text: label };
    }

    return { status: 'pendiente', text: label };
  }

  /**
   * Gets protocol analysis badge metadata for styling.
   * @private
   * @param {string | null | undefined} status - Analysis sub-status value
   * @returns {{status: 'activo' | 'inactivo' | 'pendiente', text: string}} Badge configuration
   */
  private getProtocolAnalysisBadgeMeta(
    status: string | null | undefined
  ): { status: 'activo' | 'inactivo' | 'pendiente'; text: string } {
    if (!status) {
      return { status: 'pendiente', text: '-' };
    }

    const normalized = status.toUpperCase();
    const label = this.getAnalysisSubStatusLabel(status);

    const inProgressStatuses = new Set([
      'SAMPLE_PREPARED',
      'SAMPLE_CHECKED_IN',
      'MANUAL_MEASUREMENT_IN_PROGRESS',
      'AUTOMATED_MEASUREMENT_IN_PROGRESS',
      'MEASUREMENT_MANUAL_REVIEW',
      'MEASUREMENT_AUTOMATED_REVIEW',
      'MEASUREMENT_TECHNICAL_REVIEW',
      'LOADED_RESULTS'
    ]);

    const completedStatuses = new Set([
      'READY_TO_SAMPLE_COLLECTION',
      'LOADED_RESULTS',
      'RESULTS_VALIDATED',
      'RESULTS_DELIVERED'
    ]);

    if (completedStatuses.has(normalized)) {
      return { status: 'activo', text: label };
    }

    if (normalized === 'CANCELED') {
      return { status: 'inactivo', text: label };
    }

    if (inProgressStatuses.has(normalized)) {
      return { status: 'pendiente', text: label };
    }

    return { status: 'pendiente', text: label };
  }

  /**
   * Gets payment status badge metadata for styling.
   * @private
   * @param {string | null | undefined} status - Payment status value
   * @returns {{status: 'activo' | 'inactivo' | 'pendiente', text: string}} Badge configuration
   */
  private getPaymentStatusBadgeMeta(
    status: string | null | undefined
  ): { status: 'activo' | 'inactivo' | 'pendiente'; text: string } {
    if (!status) {
      return { status: 'pendiente', text: '-' };
    }

    const normalized = status.toUpperCase();
    const label = this.paymentStatusLabel[normalized] || status;

    if (this.paymentActiveStatuses.has(normalized)) {
      return { status: 'activo', text: label };
    }

    if (this.paymentInactiveStatuses.has(normalized)) {
      return { status: 'inactivo', text: label };
    }

    return { status: 'pendiente', text: label };
  }

  /**
   * Resolves attention badge metadata based on status and team assignment.
   * Distinguishes between extractor and secretary team states.
   * @private
   * @param {string | null | undefined} status - Attention status value
   * @returns {{status: 'activo' | 'inactivo' | 'pendiente', text: string}} Badge configuration
   */
  private resolveAtentionBadgeMeta(
    status: string | null | undefined
  ): { status: 'activo' | 'inactivo' | 'pendiente'; text: string } {
    const normalized = status?.toUpperCase() ?? null;
    const defaultLabel = normalized ? this.getAtentionStatusLabel(normalized) : '-';

    if (normalized && this.extractorStates.has(normalized)) {
      return { status: 'pendiente', text: 'EN PROCESO (EXTRACTOR)' };
    }

    if (normalized && this.secretaryStates.has(normalized)) {
      return { status: 'pendiente', text: 'EN PROCESO (SECRETARIA)' };
    }

    if (normalized === 'FINISHED') {
      return { status: 'activo', text: defaultLabel || 'Completada' };
    }

    if (normalized === 'CANCELED' || normalized === 'FAILED') {
      return { status: 'inactivo', text: defaultLabel || 'Incidencia' };
    }

    return { status: 'pendiente', text: defaultLabel || 'En proceso' };
  }

  /**
   * Formats a date string to Spanish locale long date format.
   * Handles both ISO format and day-first format.
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date or "-" if invalid
   * @example
   * formatDate('2024-01-15') // "15 de enero de 2024"
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';

    const datePart = dateString.split('T')[0];
    const parts = datePart.split('-').map(Number);

    let year: number;
    let month: number;
    let day: number;

    if (parts[0] > 31) {
      [year, month, day] = parts;
    } else {
      [day, month, year] = parts;
    }

    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calculates age from birth date string.
   * Handles both ISO format and day-first format.
   * @param {string | null | undefined} birthDate - Birth date string
   * @returns {string} Age as string or "-" if invalid
   * @example
   * getAge('2000-01-15') // "24"
   */
  getAge(birthDate: string | null | undefined): string {
    if (!birthDate) return '-';

    const datePart = birthDate.split('T')[0];
    const parts = datePart.split('-').map(Number);

    let year: number;
    let month: number;
    let day: number;

    if (parts[0] > 31) {
      [year, month, day] = parts;
    } else {
      [day, month, year] = parts;
    }

    const dob = new Date(year, month - 1, day);
    if (isNaN(dob.getTime())) return '-';

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }

    return age >= 0 ? String(age) : '-';
  }

  /**
   * Gets Spanish label for attention status.
   * Provides fallback for legacy status values.
   * @private
   * @param {string} status - Attention status value
   * @returns {string} Spanish label
   */
  private getAtentionStatusLabel(status: string): string {
    const at = this.atentionStatusLabel[status];
    if (at) return at;
    const legacy: Record<string, string> = {
      PENDING: 'Pendiente',
      PARTIALLY_SIGNED: 'Parcialmente Firmado',
      READY_FOR_SIGNATURE: 'Listo para Firmar',
      CLOSED: 'Cerrado'
    };
    return legacy[status] || status;
  }

  /**
   * Gets Spanish label for payment message.
   * @param {string | null | undefined} message - Payment message value
   * @returns {string} Spanish label or original message if not mapped
   */
  getPaymentMessageLabel(message: string | null | undefined): string {
    if (!message) return '-';
    return this.paymentMessageLabel[message] || message;
  }

  /**
   * Handles filter changes from GenericTable component.
   * Applies client-side filtering to attention data based on selected status.
   * @param {FilterChangeEvent} event - Filter change event containing filter values
   * @returns {void}
   */
  onAtentionFilterChange(event: FilterChangeEvent): void {
    const map = Object.fromEntries(event.filters.map((f) => [f.id, f.value]));
    const selected = map['atentionStatus'] as string | null | undefined;

    if (!selected) {
      this.atentionData = [...this.allAtentionData];
      this.cdr.markForCheck();
      return;
    }

    this.atentionData = this.allAtentionData.filter(row => row.status === selected);
    this.cdr.markForCheck();
  }

  /**
   * Changes the active tab in the interface.
   * Reinitializes template map when switching to analysis tab.
   * @param {'general' | 'analysis'} tab - Tab to activate
   * @returns {void}
   */
  setActiveTab(tab: 'general' | 'analysis'): void {
    this.activeTab = tab;
    if (tab === 'analysis') {
      this.initializeTemplateMap();
    }
    this.cdr.markForCheck();
  }

  /**
   * Navigates back to patient list page.
   * @returns {void}
   */
  goBack(): void {
    this.router.navigate(['/patients/list']);
  }


  /**
   * Formats an address object into a readable string.
   * Concatenates street, number, floor, and apartment information.
   * @param {any} address - Address object to format
   * @returns {string} Formatted address string
   * @example
   * formatAddress({street: 'Av. Libertad', streetNumber: '123', floorNumber: '2', apartment: 'A'})
   * // "Av. Libertad, Nº 123, Piso 2, Dto. A"
   */
  formatAddress(address: any): string {
    const parts = [
      address.street,
      address.streetNumber ? `Nº ${address.streetNumber}` : null,
      address.floorNumber ? `Piso ${address.floorNumber}` : null,
      address.apartment ? `Dto. ${address.apartment}` : null
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Gets the primary address from patient addresses.
   * @returns {any | undefined} Primary address object or undefined if not found
   */
  getPrimaryAddress() {
    return this.patient?.addresses.find(a => a.isPrimary);
  }

  /**
   * Gets the primary coverage from patient coverages.
   * @returns {any | undefined} Primary coverage object or undefined if not found
   */
  getPrimaryCoverage() {
    return this.patient?.coverages.find(c => c.isPrimary);
  }

  /**
   * Gets the phone contact from patient contacts.
   * Prioritizes PHONE type, falls back to WHATSAPP.
   * @returns {any | undefined} Phone contact object or undefined if not found
   */
  getPhoneContact() {
    const phone = this.patient?.contacts.find(c => c.contactType === 'PHONE');
    if (phone) return phone;
    return this.patient?.contacts.find(c => c.contactType === 'WHATSAPP');
  }

  /**
   * Gets the email contact from patient contacts.
   * @returns {any | undefined} Email contact object or undefined if not found
   */
  getEmailContact() {
    return this.patient?.contacts.find(c => c.contactType === 'EMAIL');
  }

  /**
   * Gets all secondary (non-primary) addresses from patient.
   * @returns {Array<any>} Array of secondary address objects
   */
  getSecondaryAddresses() {
    return this.patient?.addresses.filter(a => !a.isPrimary) || [];
  }

  /**
   * Gets all secondary (non-primary) coverages from patient.
   * @returns {Array<any>} Array of secondary coverage objects
   */
  getSecondaryCoverages() {
    return this.patient?.coverages.filter(c => !c.isPrimary) || [];
  }

  /**
   * Checks if patient has valid guardian information.
   * Validates that guardian flag is set and required guardian data is present.
   * @returns {boolean} True if patient has complete guardian information
   */
  hasGuardianInfo(): boolean {
    return !!(
      this.patient?.hasGuardian &&
      this.patient.guardians &&
      Array.isArray(this.patient.guardians) &&
      this.patient.guardians.length > 0 &&
      this.patient.guardians[0] &&
      this.patient.guardians[0].document &&
      this.patient.guardians[0].firstName &&
      this.patient.guardians[0].lastName
    );
  }

  /**
   * Downloads PDF report for a specific study.
   * Creates a temporary download link and triggers download.
   * @param {number} studyId - ID of the study to download report for
   * @returns {void}
   */
  downloadReportPdf(studyId: number): void {
    if (!studyId) {
      return;
    }

    this.postAnalyticalService.downloadReportByStudyId(studyId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_estudio_${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        // TODO: Show error message
      }
    });
  }

  /**
   * Resolves doctor name from doctor ID using cache.
   * Returns cached value if available, triggers fetch if not.
   * @private
   * @param {number | null | undefined} doctorId - Doctor ID to resolve
   * @returns {string | null} Doctor name or null if not yet resolved
   */
  private resolveDoctorName(doctorId: number | null | undefined): string | null {
    if (typeof doctorId !== 'number' || Number.isNaN(doctorId)) {
      return null;
    }

    const cached = this.doctorInfoMap.get(doctorId);
    if (cached !== undefined) {
      return cached;
    }

    this.fetchDoctorName(doctorId);
    return null;
  }

  /**
   * Fetches doctor name from API and updates cache.
   * Prevents duplicate requests using pending requests tracking.
   * @private
   * @param {number} doctorId - Doctor ID to fetch
   * @returns {void}
   */
  private fetchDoctorName(doctorId: number): void {
    if (this.pendingDoctorRequests.has(doctorId)) {
      return;
    }

    this.pendingDoctorRequests.add(doctorId);

    this.doctorPatientService.getDoctorById(doctorId).pipe(
      map(doctor => this.buildDoctorDisplayName(doctor)),
      catchError(() => of('-'))
    ).subscribe({
      next: (doctorName) => {
        this.pendingDoctorRequests.delete(doctorId);
        this.doctorInfoMap.set(doctorId, doctorName);
        this.applyDoctorNamesToRows();
      },
      error: () => {
        this.pendingDoctorRequests.delete(doctorId);
      }
    });
  }

  /**
   * Applies cached doctor names to table rows.
   * Updates both filtered and unfiltered attention data arrays.
   * @private
   * @returns {void}
   */
  private applyDoctorNamesToRows(): void {
    const updateRows = (rows: any[]) =>
      rows.map(row => {
        if (typeof row.doctorId === 'number' && !Number.isNaN(row.doctorId)) {
          const cachedName = this.doctorInfoMap.get(row.doctorId);
          if (cachedName !== undefined && row.doctorName !== cachedName) {
            return { ...row, doctorName: cachedName };
          }
        }
        return row;
      });

    this.allAtentionData = updateRows(this.allAtentionData);
    this.atentionData = updateRows(this.atentionData);
    this.cdr.markForCheck();
  }

  /**
   * Builds doctor display name from doctor object.
   * Combines title and last name, falls back to name field.
   * @private
   * @param {Object | null | undefined} doctor - Doctor object
   * @param {string} [doctor.title] - Doctor's title (e.g., "Dr.", "Dra.")
   * @param {string} [doctor.lastName] - Doctor's last name
   * @param {string} [doctor.name] - Doctor's full name fallback
   * @returns {string} Formatted doctor display name or "-" if unavailable
   * @example
   * buildDoctorDisplayName({title: 'Dr.', lastName: 'García'}) // "Dr. García"
   */
  private buildDoctorDisplayName(doctor: { title?: string | null; lastName?: string | null; name?: string | null } | null | undefined): string {
    if (!doctor) {
      return '-';
    }

    const parts = [doctor.title, doctor.lastName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ').trim();
    }

    return doctor.name ?? '-';
  }

  /**
   * Downloads prescription file for an appointment.
   * Opens prescription in new window/tab for viewing.
   * @param {number} appointmentId - Appointment ID to download prescription for
   * @returns {void}
   */
  downloadPrescription(appointmentId: number): void {
    if (!appointmentId) {
      return;
    }

    this.appointmentPatientService.downloadPrescriptionFile(appointmentId).subscribe({
      next: ({ blob, filename: _filename }) => {
        const fileURL = window.URL.createObjectURL(blob);
        const newWindow = window.open(fileURL, '_blank');

        if (newWindow) {
          newWindow.onload = () => {
            setTimeout(() => {
              window.URL.revokeObjectURL(fileURL);
            }, 1000);
          };
        } else {
          setTimeout(() => {
            window.URL.revokeObjectURL(fileURL);
          }, 5000);
        }
      }
    });
  }
}
