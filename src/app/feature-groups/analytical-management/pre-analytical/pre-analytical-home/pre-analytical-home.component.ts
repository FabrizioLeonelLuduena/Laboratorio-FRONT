import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin, map, of, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { GenericTutorialComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';

import { catchError, takeUntil } from 'rxjs/operators';

import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericMenuComponent } from '../../../../shared/components/generic-menu/generic-menu.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { PrimeModalService } from '../../../../shared/components/modal/prime-modal.service';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig, TutorialStep } from '../../../../shared/models/generic-tutorial';
import { TranslateSampleTypePipe } from '../../../../shared/pipes/translate-sample-type.pipe';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService } from '../../../../shared/services/export/excel-export.service';
import { PdfExportService } from '../../../../shared/services/export/pdf-export.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { PollingService } from '../../../../shared/services/PollingService';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { PollingInstance } from '../../../../shared/utils/PollingInstance';
import { AnalysisService } from '../../analysis-catalog/application/analysis.service';
import { WorksheetListComponent } from '../../analytical/components/worksheet-list/worksheet-list.component';
import { LabelResponseDTO, LabelStatus, PagedResponse } from '../models/label.interface';
import { BranchService } from '../services/branch.service';
import { LabelService } from '../services/label.service';
import { SampleService } from '../services/sample.service';
import { WorkspaceService } from '../services/workspace.service';

import {
  PRE_ANALYTICAL_STANDARD_EXPORT_COLUMNS,
  PRE_ANALYTICAL_STANDARD_PDF_COLUMNS,
  PRE_ANALYTICAL_TRANSPORT_EXPORT_COLUMNS,
  PRE_ANALYTICAL_TRANSPORT_PDF_COLUMNS
} from './pre-analytical-export-config';
import { SAMPLE_POLLING_CONFIG } from './sample-polling.config';

/**
 * Slider option interface
 */
interface SliderOption {
  label: string;
  value: string;
}

/**
 * Polling result.
 */
type PollingResult = { list: LabelResponseDTO[]; totalRecords: number };

/**
 * Sample action types for the rejection modal
 */
enum SampleActionType {
  REJECT = 'rejected'
}

/**
 * Modal field configuration interface
 */
interface ModalField {
  label: string;
  value: string | number | boolean;
  fullWidth?: boolean; // If true, field takes full width
  isHtml?: boolean; // If true, value is rendered as HTML
}

/**
 * Modal textarea configuration interface
 */
interface ModalTextarea {
  placeholder: string;
  rows?: number;
}

/**
 * Modal button configuration
 */
interface ModalButton {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary' | 'danger';
}

/**
 * Generic modal configuration interface
 */
interface ModalConfig {
  visible: boolean;
  title: string;
  width?: string;
  fields?: ModalField[];
  textarea?: ModalTextarea;
  buttons?: ModalButton[];
  showCloseButton?: boolean; // If true, shows only a close button
  onClose: () => void;
}

/**
 * Table row data interface
 */
interface TableRowData {
  id: number;
  date: string;
  time: string;
  protocol: string;
  previousUser: string;
  patientName: string;
  origin: string;
  destination: string;
  destinationId: number | null;
  status: string;
  selected: boolean;
  rawData: LabelResponseDTO;
}

/**
 * Table column configuration interface
 */
interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}

/**
 * Export event interface
 */
interface ExportEvent {
  type: 'excel' | 'pdf';
}

/**
 * Component for the Pre-Analytical Management home page.
 * Handles sample reception and preparation before analysis.
 * Features a slider to switch between different sample states and a dynamic table.
 */
@Component({
  selector: 'app-pre-analytical-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DropdownModule,
    TooltipModule,
    GenericBadgeComponent,
    GenericTableComponent,
    GenericModalComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericMenuComponent,
    GenericTutorialComponent,
    WorksheetListComponent,
    SpinnerComponent
  ],
  providers: [TranslateSampleTypePipe],
  templateUrl: './pre-analytical-home.component.html',
  styleUrl: './pre-analytical-home.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class PreAnalyticalHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private pageTitleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private modalService = inject(PrimeModalService);
  private cdr = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private tutorialService = inject(TutorialService);
  private route = inject(ActivatedRoute);
  private branchService = inject(BranchService);
  private sampleService = inject(SampleService);
  private labelService = inject(LabelService);
  private pollingService = inject(PollingService);
  private workspaceService = inject(WorkspaceService);
  private translateSampleTypePipe = inject(TranslateSampleTypePipe);
  private analysisService = inject(AnalysisService);

  /** Polling Instances. */
  polling!: PollingInstance<PollingResult>;
  private pollingSub?: Subscription;

  /** For polling. */
  totalRecords = 0;

  /** Template reference for checkbox column */
  @ViewChild('checkboxTemplate') checkboxTemplate!: TemplateRef<any>;
  /** Template reference for the tutorial overlay. */
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  /** Template reference for worksheet list component */
  @ViewChild(WorksheetListComponent) worksheetListComponent?: WorksheetListComponent;
  /** Template reference for generic table component */
  @ViewChild(GenericTableComponent) genericTableComponent?: GenericTableComponent;

  /** Subscription to the global TutorialService trigger stream. */
  private tutorialSub?: Subscription;
  /** Configuration for the tutorial steps. */
  tutorialConfig = signal<TutorialConfig>({ steps: [] });

  /** Subject to cancel pending HTTP requests when changing tables */
  private cancelPendingRequests$ = new Subject<void>();

  /** Template reference for destination select column */
  @ViewChild('destinationSelectTemplate') destinationSelectTemplate!: TemplateRef<any>;

  /** Template reference for status badge column */
  @ViewChild('statusBadgeTemplate') statusBadgeTemplate!: TemplateRef<any>;

  /** Template reference for actions column */
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  /** Expose LabelStatus enum to template */
  readonly LabelStatus = LabelStatus;

  /** Slider options */
  sliderOptions: SliderOption[] = [
    { label: 'Ingreso de muestra', value: 'sample_entry' },
    { label: 'A preparar', value: 'to_prepare' },
    { label: 'En tránsito', value: 'to_transport' },
    { label: 'Recibido', value: 'to_receive' },
    { label: 'Procesando', value: 'to_process' },
    { label: 'A descartar', value: 'to_discard' },
    { label: 'En derivación', value: 'in_derivation' }
  ];

  /** Currently selected slider option */
  selectedOption: string = 'sample_entry';

  /** Table columns configuration */
  columns: TableColumn[] = [];

  /** Table data */
  tableData: TableRowData[] = [];

  /** Loading state */
  loading = signal<boolean>(false);

  /** Pagination */
  page: number = 0;
  pageSize: number = 5;

  /** Filters configuration */
  filters: Filter[] = [
    {
      id: 'branch',
      label: 'Sucursal',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true }
      ]
    },
    {
      id: 'area',
      label: 'Área',
      type: 'select',
      options: [
        { label: 'Seleccione una sucursal', value: null, active: true }
      ]
    },
    {
      id: 'section',
      label: 'Sección',
      type: 'select',
      options: [
        { label: 'Seleccione un área', value: null, active: true }
      ]
    }
  ];

  /** State flags to track if filters are enabled */
  private areaFilterEnabled = false;
  private sectionFilterEnabled = false;

  /** Column templates map */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /** Destination options for transport state select */
  destinationOptions: Array<{ label: string; value: number }> = [];

  /** Map of branch IDs to branch names for origin branch lookup */
  private branchMap: Map<number, string> = new Map();

  /** Map of analysisId to analysis name for quick lookup */
  private analysisMap: Map<number, string> = new Map();

  /** Flag to track if branches have been loaded */
  private branchesLoaded = false;

  /** Current sample action type (reject) */
  currentSampleAction: SampleActionType = SampleActionType.REJECT;

  /** Reason for rejecting samples */
  cancellationReason: string = '';

  /** Selected row for detail view */
  selectedRowDetail: TableRowData | null = null;

  /** Selected row for mark as lost action */
  selectedRowForLost: TableRowData | null = null;

  /** Selected row for destination change */
  selectedRowForDestination: TableRowData | null = null;
  /** New destination ID for the selected row */
  newDestinationBranchId: number | null = null;

  /** Modal configurations */
  nextStateModalConfig: ModalConfig | null = null;
  /** Sample actions modal configuration (reject) */
  cancelRejectModalConfig: ModalConfig | null = null;
  detailModalConfig: ModalConfig | null = null;
  markAsLostModalConfig: ModalConfig | null = null;
  /** Send to branch modal configuration */
  sendToBranchModalConfig: ModalConfig | null = null;

  /** Worksheet list modal visibility */
  showWorksheetListModal: boolean = false;

  /** Alert visibility */
  showAlert: boolean = false;

  /** Alert type */
  alertType: AlertType = 'success';

  /** Alert message */
  alertMessage: string = '';

  /** Alert timeout reference */
  private alertTimeout?: ReturnType<typeof setTimeout>;

  /** Sample counts by tab/status */
  /* Removed tab counters */



  /**
   * Builds the configuration for the Next State modal
   */
  private buildNextStateModalConfig(): void {
    const samplesByArea = this.getSamplesByArea();
    const areaFields: ModalField[] = Object.entries(samplesByArea).map(([areaName, count]) => ({
      label: areaName,
      value: `${count} muestra${count > 1 ? 's' : ''}`,
      fullWidth: true
    }));

    const nextStatus = this.getNextStatus();
    let nextStatusText = 'Estado siguiente desconocido.';

    if (nextStatus) {
      const translated = this.translateStatus(nextStatus);
      nextStatusText = `Estado siguiente: ${translated.toLowerCase()}.`;
    }

    this.nextStateModalConfig = {
      visible: true,
      title: nextStatusText,
      width: '700px',
      fields: [
        {
          label: 'Total de muestras:',
          value: this.totalSelectedSamples
        },
        {
          label: 'Fecha:',
          value: this.currentDate
        },
        {
          label: 'Hora:',
          value: this.currentTime
        },
        {
          label: 'Usuario:',
          value: this.userName
        },
        ...areaFields
      ],
      buttons: [
        {
          label: 'Cancelar',
          action: () => this.onReject(),
          type: 'danger'
        },
        {
          label: 'Confirmar',
          action: () => this.onConfirm(),
          type: 'primary'
        }
      ],
      onClose: () => this.onModalClose()
    };
  }

  /**
   * Builds the configuration for the Reject modal
   */
  private buildCancelRejectModalConfig(): void {
    const samplesByArea = this.getSamplesByArea();
    const areaFields: ModalField[] = Object.entries(samplesByArea).map(([areaName, count]) => ({
      label: areaName,
      value: `${count} muestra${count > 1 ? 's' : ''}`,
      fullWidth: true
    }));

    const title = 'Rechazar muestras';
    const fieldLabel = 'Total de muestras a rechazar:';
    const reasonPlaceholder = 'Ingrese el motivo de rechazo...';
    const confirmLabel = 'Sí, rechazar muestras';

    this.cancelRejectModalConfig = {
      visible: true,
      title: title,
      width: '500px',
      fields: [
        {
          label: fieldLabel,
          value: this.totalSelectedSamples
        },
        {
          label: 'Fecha:',
          value: this.currentDate
        },
        {
          label: 'Hora:',
          value: this.currentTime
        },
        {
          label: 'Usuario:',
          value: this.userName
        },
        ...areaFields
      ],
      textarea: {
        placeholder: reasonPlaceholder,
        rows: 3
      },
      buttons: [
        {
          label: 'No, volver',
          action: () => this.onCancelModalReject(),
          type: 'danger'
        },
        {
          label: confirmLabel,
          action: () => this.onCancelModalConfirm(),
          type: 'primary'
        }
      ],
      onClose: () => this.onCancelModalClose()
    };
  }

  /**
   * Builds the configuration for the Discard modal
   */
  private buildDiscardModalConfig(): void {
    this.nextStateModalConfig = {
      visible: true,
      title: 'Descartar muestra',
      width: '500px',
      fields: [
        {
          label: 'Fecha:',
          value: this.currentDate
        },
        {
          label: 'Hora:',
          value: this.currentTime
        },
        {
          label: 'Usuario:',
          value: this.userName,
          fullWidth: true
        }
      ],
      buttons: [
        {
          label: 'Cancelar',
          action: () => this.onReject(),
          type: 'danger'
        },
        {
          label: 'Confirmar',
          action: () => this.onConfirm(),
          type: 'primary'
        }
      ],
      onClose: () => this.onModalClose()
    };
  }

  /**
   * Builds the configuration for the Detail modal
   */
  private buildDetailModalConfig(): void {
    if (!this.selectedRowDetail) {
      this.detailModalConfig = null;
      return;
    }

    // Build Sucursal - Área - Sección string
    const areaName = this.selectedRowDetail.rawData?.areaName || 'N/A';
    const sectionName = this.selectedRowDetail.rawData?.sectionName || 'N/A';
    const sucursalAreaSection = `${areaName} - ${sectionName}`;

    const fields: ModalField[] = [
      {
        label: 'Protocolo:',
        value: this.selectedRowDetail.protocol
      },
      {
        label: 'Paciente:',
        value: this.selectedRowDetail.patientName
      },
      {
        label: 'Fecha:',
        value: this.selectedRowDetail.date
      },
      {
        label: 'Hora:',
        value: this.selectedRowDetail.time
      },
      {
        label: 'Sucursal - Área - Sección:',
        value: sucursalAreaSection,
        fullWidth: true
      },
      {
        label: 'Estado:',
        value: this.selectedRowDetail.status
      }
    ];

    // Add previous user if applicable
    if (this.selectedRowDetail.previousUser && this.selectedRowDetail.previousUser !== '-') {
      fields.push({
        label: 'Usuario anterior:',
        value: this.selectedRowDetail.previousUser
      });
    }

    // Add additional info fields
    if (this.selectedRowDetail.rawData) {
      const sampleType = this.selectedRowDetail.rawData.sampleType
        ? this.translateSampleTypePipe.transform(this.selectedRowDetail.rawData.sampleType)
        : 'N/A';

      // Get analysis name - prefer analysisName from backend, fallback to analysisMap lookup
      let analysisName = 'N/A';
      if (this.selectedRowDetail.rawData.analysisName) {
        // Use analysisName directly from backend if available
        analysisName = this.formatAnalysisName(this.selectedRowDetail.rawData.analysisName);
      } else if (this.selectedRowDetail.rawData.analysisId) {
        // Fallback: lookup in analysisMap using analysisId
        const name = this.analysisMap.get(this.selectedRowDetail.rawData.analysisId);
        if (name) {
          analysisName = this.formatAnalysisName(name);
        }
      }

      fields.push(
        {
          label: 'Tipo de muestra:',
          value: sampleType
        },
        {
          label: 'Análisis:',
          value: analysisName
        }
      );

      // Add indicators as full-width fields
      if (this.selectedRowDetail.rawData.urgent) {
        fields.push({
          label: 'Urgente',
          value: 'Esta muestra es urgente',
          fullWidth: true
        });
      }

      if (this.selectedRowDetail.rawData.atHome) {
        fields.push({
          label: 'A domicilio',
          value: 'Esta muestra es a domicilio',
          fullWidth: true
        });
      }

      if (this.selectedRowDetail.rawData.discarded) {
        fields.push({
          label: 'Descartado',
          value: 'Esta muestra ha sido descartada',
          fullWidth: true
        });
      }

      if (this.selectedRowDetail.rawData.status === LabelStatus.CANCELED ||
          this.selectedRowDetail.rawData.status === LabelStatus.REJECTED) {
        const statusText = this.selectedRowDetail.rawData.status === LabelStatus.CANCELED ? 'Cancelado' : 'Rechazado';
        fields.push({
          label: `${statusText}`,
          value: this.selectedRowDetail.rawData.status === LabelStatus.CANCELED ? 'Esta muestra ha sido cancelada' : 'Esta muestra ha sido rechazada',
          fullWidth: true
        });
      }

      // Add reason if exists
      if (this.selectedRowDetail.rawData.cancellationReason) {
        const reasonTitle = this.selectedRowDetail.rawData.status === LabelStatus.CANCELED
          ? 'Motivo de cancelación'
          : 'Motivo de rechazo';
        fields.push({
          label: `${reasonTitle}:`,
          value: this.selectedRowDetail.rawData.cancellationReason,
          fullWidth: true
        });
      }
    }

    this.detailModalConfig = {
      visible: true,
      title: 'Detalle de la muestra',
      width: '800px',
      fields: fields,
      showCloseButton: true,
      onClose: () => this.onDetailModalClose()
    };
  }

  /**
   * Builds the configuration for the Mark as Lost modal
   */
  private buildMarkAsLostModalConfig(): void {
    if (!this.selectedRowForLost) {
      this.markAsLostModalConfig = null;
      return;
    }

    this.markAsLostModalConfig = {
      visible: true,
      title: 'Marcar muestra como perdida',
      width: '500px',
      fields: [
        {
          label: 'Protocolo:',
          value: this.selectedRowForLost.protocol
        },
        {
          label: 'Paciente:',
          value: this.selectedRowForLost.patientName
        },
        {
          label: 'Fecha:',
          value: this.currentDate
        },
        {
          label: 'Hora:',
          value: this.currentTime
        },
        {
          label: 'Usuario:',
          value: this.userName,
          fullWidth: true
        }
      ],
      textarea: {
        placeholder: 'Ingrese el motivo de la perdida...',
        rows: 3
      },
      buttons: [
        {
          label: 'Cancelar',
          action: () => this.onMarkAsLostModalClose(),
          type: 'secondary'
        },
        {
          label: 'Confirmar',
          action: () => this.onMarkAsLostConfirm(),
          type: 'danger'
        }
      ],
      onClose: () => this.onMarkAsLostModalClose()
    };
  }

  /**
   * Constructor
   */
  constructor() {}

  /**
   * Component initialization
   */
  ngOnInit(): void {
    // this.pageTitleService.setTitle('Gestion de Analitica > Pre-Analítica');
    // Note: configureColumns() moved to ngAfterViewInit() to ensure templates are available
    this.configureFilters(); // Configure filters based on initial selectedOption
    // Load analyses for name mapping
    this.loadAnalyses();
    // Load branches first, then load data once branches are ready
    this.loadBranches();
    // this.currentDate = new Date();
    this.pageTitleService.setTitle('Pre-Analítica');
    this.breadcrumbService.buildFromRoute(this.route);

    this.setupTutorial();
  }

  /**
   * After view initialization
   */
  ngAfterViewInit(): void {
    this.configureColumns();
    this.cdr.detectChanges(); // Force change detection after templates are available

    // Focus on search input after view is initialized
    this.focusSearchInput();
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.tutorialSub?.unsubscribe();

    this.polling?.stop();

    // Complete the subject to cancel any pending requests and prevent memory leaks
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$.complete();
  }

  /**
   * Sets up the tutorial by subscribing to the tutorial service and defining the steps.
   */
  private setupTutorial(): void {
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('pre-analytical')) return;

      const steps: TutorialStep[] = [
        {
          target: '.slider-container',
          title: 'Navegación por estados',
          message: 'Usa estos botones para cambiar entre los diferentes estados de las muestras: ingreso, preparación, etc.',
          position: 'bottom'
        },
        {
          target: '.table-container',
          title: 'Tabla de muestras',
          message: 'Esta tabla muestra las muestras correspondientes al estado seleccionado.',
          position: 'top'
        },
        {
          target: 'app-generic-table span',
          title: 'Búsqueda rápida',
          message: 'Escribe aquí para realizar una búsqueda rápida de muestras',
          position: 'bottom',
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
          message: 'Haz clic en este botón para ver las acciones disponibles para cada muestra.',
          position: 'left',
          highlightPadding: 10
        },
        {
          target: '.p-popover-content',
          title: 'Acciones',
          message: 'Desde este menú puedes ver el detalle y procesar la muestra (en preparación,en tránsito o recibido).',
          position: 'left',
          highlightPadding: 10,
          onEnter: () => {
            const doc = (globalThis as any).document;
            if(!doc.querySelector('.p-popover-content')){
              const firstMenuButton = doc.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)');
              if (firstMenuButton) {
                firstMenuButton.click();
              }
            }
          }
        }
      ];

      this.tutorialConfig.set({ steps });

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 100);
    });
  }

  /**
   * Updates local date range filter values
   */
  private updateDateRangeFilter(dateFrom: Date | null | undefined, dateTo: Date | null | undefined): void {
    this.filters = this.filters.map(filter => {
      if (filter.id === 'dateRange') {
        return {
          ...filter,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null
        };
      }
      return filter;
    });
    // Reset pagination when filters change
    this.page = 0;
  }

  /**
   * Configures the polling based on the selected option.
   */
  private initializePollingForOption(option: string) {
    // Stop previous polling
    this.polling?.stop();
    this.pollingSub?.unsubscribe();

    const cfg = SAMPLE_POLLING_CONFIG[option];

    this.polling = this.pollingService.createPolling<PollingResult>({
      intervalStart: cfg.intervalStart,
      intervalMin: cfg.intervalMin,
      intervalMax: cfg.intervalMax,
      activityThreshold: cfg.activityThreshold,
      quietThreshold: cfg.quietThreshold,

      // ⬇⬇⬇ NUEVO REQUEST — una sola petición por ciclo
      request: () => {
        const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();
        if (cfg.special) {
          // Tabs de "discarded" → 3 estados juntos
          return forkJoin({
            completed: this.sampleService.getSamplesByStatus(LabelStatus.COMPLETED, areaId, sectionId, dateFrom, dateTo, page, size),
            rejected: this.sampleService.getSamplesByStatus(LabelStatus.REJECTED, areaId, sectionId, dateFrom, dateTo, page, size),
            canceled: this.sampleService.getSamplesByStatus(LabelStatus.CANCELED, areaId, sectionId, dateFrom, dateTo, page, size)
          }).pipe(
            map(res => {
              const completed = this.mapPagedResponse(res.completed);
              const rejected = this.mapPagedResponse(res.rejected);
              const canceled = this.mapPagedResponse(res.canceled);
              return {
                list: [...completed.content, ...rejected.content, ...canceled.content],
                totalRecords: completed.total + rejected.total + canceled.total
              };
            })
          );
        }

        // Tabs normales (1 estado)
        return this.sampleService.getSamplesByStatus(cfg.status, areaId, sectionId, dateFrom, dateTo, page, size).pipe(
          map(response => {
            const { content, total } = this.mapPagedResponse(response);
            return {
              list: content,
              totalRecords: total
            };
          })
        );
      },

      // Detecta diferencia de cantidad sin pedir otra request
      detectChanges: (prev, next) => {
        if (!prev) return next.totalRecords;
        return next.totalRecords - prev.totalRecords;
      }
    });

    // Nuevo subscriber: no vuelve a pedir datos. Usa lo que ya trajo el polling
    this.pollingSub = this.polling.data$
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe((res: PollingResult | null) => {
        if (!res) return;
        if (res.totalRecords === 0) return;

        this.totalRecords = res.totalRecords;
        this.appendIncoming(res.list);
      });
  }


  /** Appends new data to the existing table without refreshing de ui*/
  private appendIncoming(incomingList: LabelResponseDTO[]) {
    const mapped = this.mapToTableData(incomingList);

    const currentIds = new Set(this.tableData.map(r => r.id));
    const newOnes = mapped.filter(r => !currentIds.has(r.id));

    if (newOnes.length > 0) {
      this.tableData = [...this.tableData, ...newOnes];
    }
  }


  /**
   * Handles slider option change
   * @param option - The selected option value
   */
  onSliderChange(option: string): void {
    // Cancel any pending HTTP requests from previous table
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();

    // Cancelar polling viejo
    this.polling?.stop();
    this.pollingSub?.unsubscribe();

    // Clear table data immediately to prevent showing previous table
    this.tableData = [];
    this.page = 0;

    this.selectedOption = option;
    this.configureFilters();
    this.configureColumns();
    //this.loadDataForSelectedOption(true);
    //this.initializePollingForOption(option);
    // Focus on search input after changing tab
    this.focusSearchInput();
  }

  /**
   * Configures filters based on selected option.
   * Only "Recibido" (to_receive) has all three filters: Sucursal, Área, Sección.
   * All other tabs only have Sucursal filter.
   */
  private configureFilters(): void {
    const today = new Date();

    if (this.selectedOption === 'to_receive') {
      // For "Recibido": show all three filters + date range
      this.filters = [
        {
          id: 'branch',
          label: 'Sucursal',
          type: 'select',
          options: [
            { label: 'Todos', value: null, active: true }
          ]
        },
        {
          id: 'area',
          label: 'Área',
          type: 'select',
          options: [
            { label: 'Seleccione una sucursal', value: null, active: true }
          ]
        },
        {
          id: 'section',
          label: 'Sección',
          type: 'select',
          options: [
            { label: 'Seleccione un área', value: null, active: true }
          ]
        },
        {
          id: 'dateRange',
          type: 'dateRange',
          label: 'Periodo',
          dateFrom: today,
          dateTo: today
        }
      ];
      this.areaFilterEnabled = false;
      this.sectionFilterEnabled = false;
    } else {
      // For all other tabs: Sucursal + date range
      this.filters = [
        {
          id: 'branch',
          label: 'Sucursal',
          type: 'select',
          options: [
            { label: 'Todos', value: null, active: true }
          ]
        },
        {
          id: 'dateRange',
          type: 'dateRange',
          label: 'Periodo',
          dateFrom: today,
          dateTo: today
        }
      ];
      this.areaFilterEnabled = false;
      this.sectionFilterEnabled = false;
    }

    // Reload branches to populate the branch filter options
    this.loadBranches();
  }

  /**
   * Loads all branches and populates the branch filter and destination options
   */
  private loadBranches(): void {
    this.branchService.getAllResumeBranches().subscribe({
      next: (branches) => {
        // Populate branchMap for origin branch lookup
        this.branchMap.clear();
        branches.forEach(branch => {
          this.branchMap.set(branch.id, branch.description);
        });

        // Mark branches as loaded
        this.branchesLoaded = true;

        // Populate destination options for the dropdown in transport state
        this.destinationOptions = branches.map(branch => ({
          label: branch.description,
          value: branch.id
        }));

        // Check if there's already a selected branch (preserve user selection)
        const currentBranchId = this.getActiveFilterValue('branch');

        // Map branches to filter options
        const branchOptions = branches.map(branch => ({
          label: branch.description,
          value: branch.id,
          active: false
        }));

        // Determine which branch to select
        let branchIdToSelect: number | null = currentBranchId;

        // Only use localStorage default if no current selection exists
        if (branchIdToSelect === null) {
          const branchFromStorage = this.getAuthUserBranchFromStorage();
          if (branchFromStorage !== null) {
            branchIdToSelect = branchFromStorage;
          }
        }

        // Find and activate the matching branch
        if (branchIdToSelect !== null) {
          const selectedBranch = branchOptions.find(opt => opt.value === branchIdToSelect);
          if (selectedBranch) {
            selectedBranch.active = true;
          }
        }

        // Update branch filter options
        this.filters = this.filters.map(filter => {
          if (filter.id === 'branch') {
            return {
              ...filter,
              options: branchOptions
            };
          }
          return filter;
        });

        // Now that branches are loaded, load data and start polling
        this.loadDataForSelectedOption(true);
        this.initializePollingForOption(this.selectedOption);
      },
      error: (_error) => {
        // Even if branches fail to load, still load data
        this.branchesLoaded = true; // Set to true even on error to avoid infinite loops
        this.loadDataForSelectedOption();
        this.initializePollingForOption(this.selectedOption);
      }
    });
  }
  /**
   * Loads all analyses and populates the analysisMap for quick lookup
   */
  private loadAnalyses(): void {
    this.analysisService.getAnalyses().subscribe({
      next: (analyses) => {
        // Populate analysisMap for quick lookup by ID
        this.analysisMap.clear();
        analyses.forEach(analysis => {
          this.analysisMap.set(analysis.id, analysis.name);
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Silently fail - analysis names will default to 'N/A'
      }
    });
  }

  /**
   * Handles filter changes from the FilterComponent
   * @param event - Filter change event
   */
  onFilterChange(event: FilterChangeEvent): void {
    // Process each filter change
    event.filters.forEach(filter => {
      if (filter.id === 'branch') {
        this.onBranchFilterChange(filter.value as number | null);
      } else if (filter.id === 'area') {
        this.onAreaFilterChange(filter.value as number | null);
      } else if (filter.id === 'section') {
        this.onSectionFilterChange(filter.value as number | null);
      } else if (filter.id === 'dateRange') {
        const from = (filter as any).dateFrom ?? null;
        const to = (filter as any).dateTo ?? null;

        // Sync internal visual filter state so the datepicker always shows the last selection
        this.filters = this.filters.map(f =>
          f.id === 'dateRange'
            ? { ...f, dateFrom: from, dateTo: to }
            : f
        );

        // No guard de "parcial" acá: siempre actualizamos el estado de rango
        // y dejamos que el propio componente de filtros decida cuándo emitir el evento completo.
        this.page = 0;
        this.loadDataForSelectedOption();
      }
    });
  }

  /**
   * Handles branch filter change
   * @param branchId - Selected branch ID (null for "Todos")
   */
  private onBranchFilterChange(branchId: number | null): void {
    // Reset area and section filters
    this.resetFilter('area', 'Seleccione una sucursal');
    this.resetFilter('section', 'Seleccione un área');
    this.areaFilterEnabled = false;
    this.sectionFilterEnabled = false;
    this.page = 0;

    if (branchId === null) {
      this.loadDataForSelectedOption();
      return;
    }

    // Enable area filter and load areas
    this.areaFilterEnabled = true;
    this.loadAreas(branchId);
  }

  /**
   * Handles area filter change
   * @param areaId - Selected area ID (null for "Todos")
   */
  private onAreaFilterChange(areaId: number | null): void {
    // Reset section filter
    this.resetFilter('section', 'Seleccione un área');
    this.sectionFilterEnabled = false;
    this.page = 0;

    if (areaId === null || !this.areaFilterEnabled) {
      this.loadDataForSelectedOption();
      return;
    }

    const branchId = this.getActiveFilterValue('branch');
    if (branchId === null) {
      return;
    }

    // Enable section filter and load sections
    this.sectionFilterEnabled = true;
    this.loadSections(branchId, areaId);
  }

  /**
   * Handles section filter change
   */
  private onSectionFilterChange(_sectionId: number | null): void {
    this.page = 0;
    // Reload data with new filters
    this.loadDataForSelectedOption();
  }

  /**
   * Loads areas for a given branch
   * @param branchId - The branch ID
   */
  private loadAreas(branchId: number): void {
    this.workspaceService.getAreasByBranch(branchId).subscribe({
      next: (workspaceAreas) => {
        const areaOptions = workspaceAreas.map(wa => ({
          label: wa.area.name,
          value: wa.area.id,
          active: false
        }));

        // Update area filter options
        this.updateFilterOptions('area', [
          { label: 'Todos', value: null, active: true },
          ...areaOptions
        ]);

        this.loadDataForSelectedOption();
      },
      error: (_error) => {
        // TODO: Handle error (show alert or notification)
      }
    });
  }

  /**
   * Loads sections for a given branch and area
   * @param branchId - The branch ID
   * @param areaId - The area ID
   */
  private loadSections(branchId: number, areaId: number): void {
    this.workspaceService.getSectionsByBranchAndArea(branchId, areaId).subscribe({
      next: (workspaceSections) => {
        const sectionOptions = workspaceSections.map(ws => ({
          label: ws.section.name,
          value: ws.section.id,
          active: false
        }));

        // Update section filter options
        this.updateFilterOptions('section', [
          { label: 'Todos', value: null, active: true },
          ...sectionOptions
        ]);

        this.loadDataForSelectedOption();
      },
      error: (_error) => {
        // TODO: Handle error (show alert or notification)
      }
    });
  }

  /**
   * Gets the active filter value for a given filter ID
   * @param filterId - The filter identifier
   * @returns The active filter value or null
   */
  private getActiveFilterValue(filterId: string): number | null {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) {
      return null;
    }

    const activeOption = filter.options?.find(opt => opt.active);
    const value = activeOption?.value ?? null;

    // Return as number or null
    return typeof value === 'number' ? value : null;
  }

  /**
   * Gets the active date range filter values formatted for API
   */
  private getActiveDateRange(): { dateFrom?: string; dateTo?: string } {
    const dateFilter = this.filters.find(f => f.id === 'dateRange');
    const format = (d?: Date | null) => {
      if (!d) return undefined;
      const date = new Date(d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      dateFrom: format(dateFilter?.dateFrom ?? undefined),
      dateTo: format(dateFilter?.dateTo ?? undefined)
    };
  }

  /**
   * Updates filter options for a given filter ID
   * @param filterId - The filter identifier
   * @param options - New options array
   */
  private updateFilterOptions(filterId: string, options: Array<{ label: string; value: any; active: boolean }>): void {
    this.filters = this.filters.map(filter => {
      if (filter.id === filterId) {
        return { ...filter, options };
      }
      return filter;
    });
  }

  /**
   * Resets a filter to its default state
   * @param filterId - The filter identifier
   * @param defaultLabel - Label to show when disabled (optional)
   */
  private resetFilter(filterId: string, defaultLabel: string = 'Todos'): void {
    this.filters = this.filters.map(filter => {
      if (filter.id === filterId) {
        return {
          ...filter,
          options: [
            { label: defaultLabel, value: null, active: true }
          ]
        };
      }
      return filter;
    });
  }

  /**
   * Maps a string to the corresponding LabelStatus.
   * @param option
   * @private
   */
  private mapOptionToStatus(option: string): LabelStatus | 'discarded' | null {
    const mapping: Record<string, LabelStatus | 'discarded'> = {
      sample_entry: LabelStatus.COLLECTED,
      to_prepare: LabelStatus.IN_PREPARATION,
      to_transport: LabelStatus.IN_TRANSIT,
      to_receive: LabelStatus.DELIVERED,
      to_process: LabelStatus.PROCESSING,
      in_derivation: LabelStatus.DERIVED,
      to_discard: 'discarded'
    };

    return mapping[option] ?? null;
  }

  /**
   * Handles paginator changes from the table
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.pageSize = event.rows;
    this.page = Math.floor((event.first ?? 0) / this.pageSize);
    this.loadDataForSelectedOption();
  }

  /**
   * Safely extracts content and total count from a paged response.
   */
  private mapPagedResponse(response: PagedResponse): { content: LabelResponseDTO[]; total: number } {
    const content = response?.content ?? [];
    const total = response?.totalElements ?? content.length;
    return { content, total };
  }

  /**
   * Loads data based on the selected slider option
   */
  private loadDataForSelectedOption(clear: boolean = false): void {
    this.loading.set(true);

    if (clear) {
      this.tableData = [];
      this.totalRecords = 0;
    }

    const status = this.mapOptionToStatus(this.selectedOption);

    if (!status) {
      this.loading.set(false);
      this.totalRecords = 0;
      return;
    }

    if (status === 'discarded') {
      this.loadDiscardedSamples();
    } else {
      this.loadSamplesByStatus(status);
    }
  }

  /**
   * Builds filter params for API calls
   */
  private buildFilterParams(): { areaId?: number; sectionId?: number; dateFrom?: string; dateTo?: string; page: number; size: number } {
    const areaId = this.getActiveFilterValue('area') ?? undefined;
    const sectionId = this.getActiveFilterValue('section') ?? undefined;
    const { dateFrom, dateTo } = this.getActiveDateRange();

    return { areaId, sectionId, dateFrom, dateTo, page: this.page, size: this.pageSize };
  }

  /**
   * Loads samples by a specific status
   * @param status - The label status to filter by
   */
  private loadSamplesByStatus(status: LabelStatus): void {
    // Get selected filter values
    const { areaId, sectionId, dateFrom, dateTo } = this.buildFilterParams();

    this.sampleService.getSamplesByStatus(status, areaId, sectionId, dateFrom, dateTo, this.page, this.pageSize)
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: (response: PagedResponse) => {
          const { content, total } = this.mapPagedResponse(response);
          this.totalRecords = total;
          this.tableData = this.mapToTableData(content);
          this.loading.set(false);
        },
        error: (_error) => {
          this.loading.set(false);
          this.totalRecords = 0;
          // TODO: Handle error (show alert or notification)
        }
      });
  }

  /**
   * Loads samples with COMPLETED, REJECTED or CANCELED status using forkJoin
   */
  private loadDiscardedSamples(): void {
    const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();

    forkJoin({
      completed: this.sampleService.getSamplesByStatus(LabelStatus.COMPLETED, areaId, sectionId, dateFrom, dateTo, page, size),
      rejected: this.sampleService.getSamplesByStatus(LabelStatus.REJECTED, areaId, sectionId, dateFrom, dateTo, page, size),
      canceled: this.sampleService.getSamplesByStatus(LabelStatus.CANCELED, areaId, sectionId, dateFrom, dateTo, page, size)
    })
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: (results) => {
          const completed = this.mapPagedResponse(results.completed);
          const rejected = this.mapPagedResponse(results.rejected);
          const canceled = this.mapPagedResponse(results.canceled);
          const combinedData = [...completed.content, ...rejected.content, ...canceled.content];
          this.totalRecords = completed.total + rejected.total + canceled.total;
          this.tableData = this.mapToTableData(combinedData);
          this.loading.set(false);
        },
        error: (_error) => {
          this.loading.set(false);
          this.totalRecords = 0;
          // TODO: Handle error (show alert or notification)
        }
      });
  }

  /**
   * Loads samples by a specific status
   */
  private appenSamplesBySelectedOption(): void {
    const status = this.mapOptionToStatus(this.selectedOption);

    if (!status) return;

    if (status === 'discarded') {
      this.appendDiscardedSamples();
    } else {
      this.appendSamplesByStatus(status);
    }
  }

  /**
   * Reverse status map.
   * @private
   */
  private readonly reverseStatusMap: Record<string, LabelStatus> = {
    'PENDING': LabelStatus.PENDING,
    'COLLECTED': LabelStatus.COLLECTED,
    'IN_TRANSIT': LabelStatus.IN_TRANSIT,
    'IN_PREPARATION': LabelStatus.IN_PREPARATION,
    'DERIVED': LabelStatus.DERIVED,
    'LOST': LabelStatus.LOST,
    'DELIVERED': LabelStatus.DELIVERED,
    'PROCESSING': LabelStatus.PROCESSING,
    'COMPLETED': LabelStatus.COMPLETED,
    'CANCELED': LabelStatus.CANCELED,
    'REJECTED': LabelStatus.REJECTED
  };

  /**
   * Appends new data retrieve from polling without refreshing the UI
   * @param status
   * @private
   */
  private appendSamplesByStatus(status: LabelStatus): void {
    const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();

    this.sampleService.getSamplesByStatus(status, areaId, sectionId, dateFrom, dateTo, page, size)
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: (incoming: PagedResponse) => {
          const { content, total } = this.mapPagedResponse(incoming);
          const mappedIncoming = this.mapToTableData(content);
          this.totalRecords = total;

          // Filtrar solo los del estado correcto (rawStatus via reverse mapping)
          const validIncoming = mappedIncoming.filter(r => {
            const enumStatus = this.reverseStatusMap[r.status];
            return enumStatus === status;
          });

          const currentIds = new Set(this.tableData.map(r => r.id));
          const newOnes = validIncoming.filter(r => !currentIds.has(r.id));

          if (newOnes.length > 0) {
            this.tableData = [...this.tableData, ...newOnes];
          }
        }
      });
  }

  /**
   * Appends new data retrieve from polling without refreshing the UI
   * @private
   */
  private appendDiscardedSamples(): void {
    const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();

    forkJoin({
      completed:  this.sampleService.getSamplesByStatus(LabelStatus.COMPLETED, areaId, sectionId, dateFrom, dateTo, page, size),
      rejected:   this.sampleService.getSamplesByStatus(LabelStatus.REJECTED, areaId, sectionId, dateFrom, dateTo, page, size),
      canceled:   this.sampleService.getSamplesByStatus(LabelStatus.CANCELED, areaId, sectionId, dateFrom, dateTo, page, size)
    })
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: (res) => {
          const completed = this.mapPagedResponse(res.completed);
          const rejected = this.mapPagedResponse(res.rejected);
          const canceled = this.mapPagedResponse(res.canceled);
          const combined = [...completed.content, ...rejected.content, ...canceled.content];
          const mappedIncoming = this.mapToTableData(combined);
          this.totalRecords = completed.total + rejected.total + canceled.total;

          const validStatuses = new Set<LabelStatus>([
            LabelStatus.COMPLETED,
            LabelStatus.REJECTED,
            LabelStatus.CANCELED
          ]);

          const validIncoming = mappedIncoming.filter(r => {
            const enumStatus = this.reverseStatusMap[r.status];
            return !!enumStatus && validStatuses.has(enumStatus);
          });

          const currentIds = new Set(this.tableData.map(r => r.id));
          const newOnes = validIncoming.filter(r => !currentIds.has(r.id));

          if (newOnes.length > 0) {
            this.tableData = [...this.tableData, ...newOnes];
          }
        }
      });
  }


  /** Very light polling request: RETURNS ONLY COUNT */
  private getCountByStatus(status: LabelStatus) {
    const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();
    return this.sampleService.getSamplesByStatus(status, areaId, sectionId, dateFrom, dateTo, page, size).pipe(
      map(response => {
        const { total } = this.mapPagedResponse(response);
        return { totalRecords: total };
      }),
      catchError(() => of({ totalRecords: 0 }))
    );
  }

  /** Very light polling request: RETURNS ONLY COUNT */
  private getDiscardedCount() {
    const { areaId, sectionId, dateFrom, dateTo, page, size } = this.buildFilterParams();
    return forkJoin({
      completed: this.sampleService.getSamplesByStatus(LabelStatus.COMPLETED, areaId, sectionId, dateFrom, dateTo, page, size),
      rejected:  this.sampleService.getSamplesByStatus(LabelStatus.REJECTED, areaId, sectionId, dateFrom, dateTo, page, size),
      canceled:  this.sampleService.getSamplesByStatus(LabelStatus.CANCELED, areaId, sectionId, dateFrom, dateTo, page, size)
    }).pipe(
      map(res => {
        const completed = this.mapPagedResponse(res.completed).total;
        const rejected = this.mapPagedResponse(res.rejected).total;
        const canceled = this.mapPagedResponse(res.canceled).total;
        return {
          totalRecords: completed + rejected + canceled
        };
      }),
      catchError(() => of({ totalRecords: 0 }))
    );
  }

  /**
   * Maps LabelResponseDTO to table data format
   * @param data - Array of LabelResponseDTO
   * @returns Mapped table data
   */
  private mapToTableData(data: LabelResponseDTO[]): TableRowData[] {
    return data.map(item => {
      const dateTime = this.parseDateTime(item.createdDateTime);

      // Get origin branch name from branchMap
      const originBranchName = item.originBranchId
        ? this.branchMap.get(item.originBranchId) || 'N/A'
        : 'N/A';

      // Get destination branch name from branchMap
      // For display: If destinationBranchId is not set, show originBranchId
      const displayBranchId = item.destinationBranchId || item.originBranchId;
      const destinationBranchName = displayBranchId
        ? this.branchMap.get(displayBranchId) || 'N/A'
        : 'N/A';

      return {
        id: item.id,
        date: dateTime.date,
        time: dateTime.time,
        protocol: item.protocolId.toString(),
        previousUser: '-', // TODO: Get from backend when available
        patientName: this.formatPatientName(item.patientName),
        origin: originBranchName,
        destination: destinationBranchName,
        destinationId: item.destinationBranchId ?? null, // For select binding: only use actual destinationBranchId, not fallback
        status: this.translateStatus(item.status),
        selected: false,
        rawData: item // Store original data for future use
      };
    });
  }

  /**
   * Parses a datetime string from backend format (dd-MM-yyyy HH:mm:ss)
   * @param dateTimeStr - DateTime string from backend
   * @returns Object with separated date and time strings
   */
  private parseDateTime(dateTimeStr: string): { date: string; time: string } {
    if (!dateTimeStr) {
      return { date: 'N/A', time: 'N/A' };
    }

    const parts = dateTimeStr.split(' ');
    if (parts.length !== 2) {
      return { date: dateTimeStr, time: '' };
    }

    const datePart = parts[0]; // dd-MM-yyyy
    const timePart = parts[1]; // HH:mm:ss

    // Format date to dd/MM/yyyy
    const formattedDate = datePart.replace(/-/g, '/');

    // Format time to HH:mm (remove seconds)
    const timeComponents = timePart.split(':');
    const formattedTime = `${timeComponents[0]}:${timeComponents[1]}`;

    return {
      date: formattedDate,
      time: formattedTime
    };
  }

  /**
   * Configures table columns based on selected option
   */
  private configureColumns(): void {
    const baseColumns: TableColumn[] = [];

    // Add checkbox column (no visible header), except in "to_process" mode
    if (this.checkboxTemplate && this.selectedOption !== 'to_process') {
      baseColumns.push({
        field: 'checkbox',
        header: '',
        template: this.checkboxTemplate
      });
    }

    // Add common columns: Fecha, Hora (no sortable), Protocolo
    baseColumns.push(
      { field: 'date', header: 'Fecha', sortable: true },
      { field: 'time', header: 'Hora', sortable: false },
      { field: 'protocol', header: 'Protocolo', sortable: true }
    );

    // Define status column with badge template
    const statusColumn = this.statusBadgeTemplate
      ? { field: 'status', header: 'Estado', sortable: true, template: this.statusBadgeTemplate }
      : { field: 'status', header: 'Estado', sortable: true };

    // Define actions column with custom template
    // Header is "Acción" (singular) when only one action, "Acciones" when multiple
    const actionsHeader = this.selectedOption === 'in_derivation' ? 'Acciones' : 'Acción';
    const actionsColumn = this.actionsTemplate
      ? { field: 'actions', header: actionsHeader, sortable: false, template: this.actionsTemplate }
      : { field: 'actions', header: actionsHeader, sortable: false };

    // Configure columns based on selected option
    if (this.selectedOption === 'to_transport') {
      // For "En tránsito": use dropdown for destination selection
      const destinationColumn = this.destinationSelectTemplate
        ? { field: 'destination', header: 'Destino', sortable: true, template: this.destinationSelectTemplate }
        : { field: 'destination', header: 'Destino', sortable: true };

      this.columns = [
        ...baseColumns,
        { field: 'patientName', header: 'Paciente', sortable: true },
        { field: 'origin', header: 'Procedencia', sortable: true },
        destinationColumn,
        statusColumn,
        actionsColumn
      ];
    } else if (this.selectedOption === 'sample_entry' || this.selectedOption === 'to_prepare') {
      // For "Ingreso de muestra" and "A preparar": no destination column
      this.columns = [
        ...baseColumns,
        { field: 'patientName', header: 'Paciente', sortable: true },
        { field: 'origin', header: 'Procedencia', sortable: true },
        statusColumn,
        actionsColumn
      ];
    } else {
      // For all other options: standard text column for destination
      this.columns = [
        ...baseColumns,
        { field: 'patientName', header: 'Paciente', sortable: true },
        { field: 'origin', header: 'Procedencia', sortable: true },
        { field: 'destination', header: 'Destino', sortable: true },
        statusColumn,
        actionsColumn
      ];
    }
  }

  /**
   * Handles "Cargar resultados" button click for processing mode
   * Opens worksheet list modal to select and fill worksheets
   */
  onLoadResults(): void {
    this.showWorksheetListModal = true;
    // Trigger template load after view is initialized
    setTimeout(() => {
      if (this.worksheetListComponent) {
        this.worksheetListComponent.loadTemplates();
      }
    }, 0);
  }

  /**
   * Closes the worksheet list modal
   */
  onCloseWorksheetListModal(): void {
    this.showWorksheetListModal = false;
  }

  /**
   * Handles "Estado Anterior" button click
   * Returns selected samples to their previous state
   */
  onPreviousState(): void {
    const selectedRows = this.tableData.filter(row => row.selected);

    if (selectedRows.length === 0) {
      this.showAlertMessage('warning', 'Debe seleccionar al menos una muestra');
      return;
    }

    // Get previous status based on current tab/state
    const previousStatus = this.getPreviousStatus();

    if (!previousStatus) {
      this.showAlertMessage('error', 'No se puede retroceder desde este estado');
      return;
    }

    // Get user ID
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      this.showAlertMessage('error', 'No se pudo obtener la información del usuario');
      return;
    }
    const userId = JSON.parse(authUser).id;

    // Show confirmation modal
    this.buildPreviousStateModalConfig(selectedRows, previousStatus, userId);
  }

  /**
   * Builds the confirmation modal for previous state action
   * @param selectedRows - The selected rows
   * @param previousStatus - The previous status to rollback to
   * @param userId - The user ID
   */
  private buildPreviousStateModalConfig(selectedRows: TableRowData[], previousStatus: LabelStatus, userId: number): void {
    const sampleCount = selectedRows.length;
    const previousStatusText = this.translateStatus(previousStatus);

    this.nextStateModalConfig = {
      visible: true,
      title: 'Confirmar retroceso de estado',
      fields: [
        {
          label: 'Muestras seleccionadas',
          value: `${sampleCount} muestra${sampleCount > 1 ? 's' : ''}`,
          fullWidth: true
        },
        {
          label: 'Estado anterior',
          value: previousStatusText,
          fullWidth: true
        }
      ],
      buttons: [
        {
          label: 'Cancelar',
          action: () => this.onModalClose(),
          type: 'secondary'
        },
        {
          label: 'Confirmar',
          action: () => this.executePreviousState(selectedRows, previousStatus, userId),
          type: 'primary'
        }
      ],
      onClose: () => this.onModalClose()
    };
  }

  /**
   * Executes the rollback of samples to previous status
   * @param selectedRows - The selected rows
   * @param previousStatus - The previous status
   * @param userId - The user ID
   */
  private executePreviousState(selectedRows: TableRowData[], previousStatus: LabelStatus, userId: number): void {
    this.onModalClose();
    this.loading.set(true);
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
    // Pause polling while rollback is executed to avoid race conditions with full reload
    this.polling?.stop();

    const rollbackRequests = selectedRows.map(row =>
      this.sampleService.rollbackSampleStatus(
        row.rawData.protocolId,
        row.rawData.id,
        previousStatus,
        userId
      )
    );

    forkJoin(rollbackRequests)
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: () => {
          this.showAlertMessage('success', `Se ${selectedRows.length === 1 ? 'ha' : 'han'} retrocedido ${selectedRows.length} muestra${selectedRows.length > 1 ? 's' : ''} correctamente.`);
          this.loadDataForSelectedOption(false);
          // Restart polling after table has been fully reloaded
          this.initializePollingForOption(this.selectedOption);
          this.loading.set(false);
        },
        error: (_error) => {
          this.showAlertMessage('error', 'No se pudo retroceder el estado de las muestras. Verifique que la transición sea válida.');
          this.loading.set(false);
        }
      });
    this.initializePollingForOption(this.selectedOption);
  }

  /**
   * Handles "Estado Siguiente" button click
   * Opens the confirmation modal with sample summary
   */
  onNextState(): void {
    if (this.tableData.filter(row => row.selected).length === 0) {
      return;
    }
    this.buildNextStateModalConfig();
  }

  /**
   * Handles "Rechazar Muestra" button click
   * Opens the reject confirmation modal
   */
  onRejectSample(): void {
    if (this.tableData.filter(row => row.selected).length === 0) {
      return;
    }
    this.currentSampleAction = SampleActionType.REJECT;
    this.cancellationReason = '';
    this.buildCancelRejectModalConfig();
  }

  /**
   * Handles "Descartar" button click
   * Opens the discard confirmation modal
   */
  onDiscard(): void {
    if (this.tableData.filter(row => row.selected).length === 0) {
      return;
    }
    this.buildDiscardModalConfig();
  }

  /**
   * Handles "Descartar" action from row menu
   * Selects the row and opens the discard confirmation modal
   */
  onDiscardFromRow(row: TableRowData): void {
    // Clear all selections first
    this.tableData.forEach(r => r.selected = false);
    // Select only the clicked row
    row.selected = true;
    // Open the discard modal
    this.buildDiscardModalConfig();
  }

  /**
   * Handles add/register button click from AdvancedTable
   * Opens the confirmation modal with sample summary
   */
  onAddClicked(): void {
    if (this.tableData.filter(row => row.selected).length === 0) {
      return;
    }
    this.buildNextStateModalConfig();
  }

  /**
   * Handles row selection change
   * @param row - The row being toggled
   * @param checked - The new checked state
   */
  onRowSelectionChange(row: TableRowData, checked: boolean): void {
    row.selected = checked;
  }

  /**
   * Handles Enter key press in search input
   * Marks all rows matching the protocol search term as selected and clears the search input
   */
  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.genericTableComponent) {
      // Get the current search term
      const searchTerm = this.genericTableComponent.globalFilterValue().trim();

      // Clear all selections first
      this.tableData.forEach(row => row.selected = false);

      // When lazy=true, filteredData() doesn't apply filtering,
      // so we need to manually filter the data based on the protocol field only
      const rowsToSelect = searchTerm
        ? this.tableData.filter(row =>
          row.protocol.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

      // Mark filtered rows as selected
      rowsToSelect.forEach(row => {
        row.selected = true;
      });

      // Clear the search input by setting the signal to empty string
      this.genericTableComponent.globalFilterValue.set('');

      // Clear the search input after marking selections
      const searchInput = (window as any).document.querySelector('app-generic-table input[type="text"]');
      if (searchInput) {
        searchInput.value = '';
        // Trigger input event to update the table filter
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  /**
   * Gets the count of selected rows
   * @returns Number of selected rows
   */
  get selectedRowsCount(): number {
    return this.tableData.filter(row => row.selected).length;
  }

  /**
   * Determines if bulk sample actions should be disabled
   * (no rows in table or no rows selected)
   */
  get isSampleBulkActionDisabled(): boolean {
    const noRows = this.tableData.length === 0;
    const noSelection = this.selectedRowsCount === 0;
    return noRows || noSelection;
  }

  /**
   * Determines if the "Previous State" button should be disabled
   * @returns True if in first state or without rows/selection
   */
  get isPreviousStateDisabled(): boolean {
    const isFirstState = this.selectedOption === 'sample_entry';
    return isFirstState || this.isSampleBulkActionDisabled;
  }

  /**
   * Function to generate actions for each table row
   */
  getActions = (row: TableRowData) => {
    // Add "Marcar Pérdida" action only in "in_derivation" mode
    if (this.selectedOption === 'in_derivation') {
      return [
        {
          id: 'view-detail',
          label: 'Ver detalle',
          icon: 'pi pi-eye',
          command: () => this.onViewDetail(row)
        },
        {
          id: 'mark-lost',
          label: 'Marcar pérdida',
          icon: 'pi pi-exclamation-triangle',
          command: () => this.onMarkAsLost(row)
        }
      ];
    }

    // For all other tables, return single "Ver detalle" action
    return [
      {
        id: 'view-detail',
        label: 'Ver detalle',
        icon: 'pi pi-eye',
        command: () => this.onViewDetail(row),
        directButton: true // Flag to indicate this should be a direct button, not a menu
      }
    ];
  };

  /**
   * Determines if actions should show as menu or direct button
   * @param row - The row data
   * @returns True if should show menu (multiple actions), false for direct button (single action)
   */
  shouldShowActionsMenu = (row: TableRowData): boolean => {
    const actions = this.getActions(row);
    return actions.length > 1;
  };

  /**
   * Formats analysis name: converts from UPPERCASE to Title Case
   * Each word starts with uppercase, rest lowercase
   * @param analysisName - Analysis name in UPPERCASE
   * @returns Formatted analysis name in Title Case
   */
  private formatAnalysisName(analysisName: string | undefined | null): string {
    if (!analysisName) return 'N/A';

    // Remove trailing period if exists
    let cleanedName = analysisName!.trim();
    if (cleanedName.endsWith('.')) {
      cleanedName = cleanedName.slice(0, -1);
    }

    // Split by spaces, capitalize first letter of each word
    return cleanedName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Formats patient name from "Nombre Apellido" to "Apellido, Nombre"
   * @param patientName - Patient name in format "Nombre Apellido"
   * @returns Formatted patient name as "Apellido, Nombre"
   */
  private formatPatientName(patientName: string | undefined): string {
    if (!patientName || patientName === '-') return patientName || '-';

    const parts = patientName.trim().split(' ');
    if (parts.length < 2) return patientName;

    // Assume last part is apellido, everything else is nombre
    const apellido = parts[parts.length - 1];
    const nombre = parts.slice(0, -1).join(' ');

    return `${apellido}, ${nombre}`;
  }

  /**
   * Calculates samples grouped by area from selected rows
   * @returns Object with area names as keys and sample counts as values
   */
  getSamplesByArea(): { [area: string]: number } {
    const selectedRows = this.tableData.filter(row => row.selected);
    const areaCount: { [area: string]: number } = {};

    selectedRows.forEach(row => {
      const area = row.rawData.areaName || 'N/A';
      if (area && area !== '-' && area !== 'N/A') {
        areaCount[area] = (areaCount[area] || 0) + 1;
      }
    });

    return areaCount;
  }

  /**
   * Gets the total count of selected samples
   * @returns Total number of selected samples
   */
  get totalSelectedSamples(): number {
    return this.tableData.filter(row => row.selected).length;
  }

  /**
   * Gets current date formatted as dd/MM/yyyy
   * @returns Formatted date string
   */
  get currentDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Gets current time formatted as HH:mm
   * @returns Formatted time string
   */
  get currentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Gets formatted user name from localStorage
   * @returns Full name of current user
   */
  get userName(): string {
    const authUserStr = localStorage.getItem('auth_user');
    if (!authUserStr) return 'Usuario';

    try {
      const authUser = JSON.parse(authUserStr);
      const firstName = typeof authUser?.firstName === 'string' ? authUser.firstName.trim() : '';
      const lastName = typeof authUser?.lastName === 'string' ? authUser.lastName.trim() : '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Usuario';
    } catch (_e) {
      return _e instanceof SyntaxError ? 'Usuario' : 'Usuario';
    }
  }

  /**
   * Returns the badge type based on the label status
   * @param row - The table row data containing the label information
   * @returns Badge type: 'activo' (green), 'inactivo' (red), 'minimo' (yellow), or 'completo' (blue)
   */
  getStatusBadgeType(row: TableRowData): 'activo' | 'inactivo' | 'minimo' | 'completo' {
    const status = row.rawData.status;

    // Red badge for rejected and canceled
    if (status === LabelStatus.REJECTED || status === LabelStatus.CANCELED) {
      return 'inactivo';
    }

    // Blue badge for completed
    if (status === LabelStatus.COMPLETED) {
      return 'completo';
    }

    // Yellow badge for derived
    if (status === LabelStatus.DERIVED) {
      return 'minimo';
    }

    // Green badge for all other active statuses
    return 'activo';
  }

  /**
   * Handles view detail action
   * Opens a modal with sample details using PrimeModalService (same as sample-reception)
   */
  private onViewDetail(row: TableRowData): void {
    // Translate sample type
    const translatedSampleType = row.rawData.sampleType
      ? this.translateSampleTypePipe.transform(row.rawData.sampleType)
      : 'N/A';

    // Get analysis name - prefer analysisName from backend, fallback to analysisMap lookup
    let analysisName = 'N/A';
    if (row.rawData.analysisName) {
      analysisName = this.formatAnalysisName(row.rawData.analysisName);
    } else if (row.rawData.analysisId) {
      const name = this.analysisMap.get(row.rawData.analysisId);
      if (name) {
        analysisName = this.formatAnalysisName(name);
      }
    }

    // Build additional info array
    const additionalInfo: Array<{ label: string; value: string }> = [
      { label: 'Protocolo', value: row.protocol || 'N/A' },
      { label: 'Paciente', value: row.patientName || 'N/A' },
      { label: 'Estado', value: this.translateStatus(row.rawData.status) }
    ];

    // Add rejection reason right after Estado if status is REJECTED (not CANCELED)
    // Backend uses rejectionReason field for REJECTED status, cancellationReason for CANCELED status
    const rejectionReason = row.rawData.rejectionReason || row.rawData.cancellationReason || row.rawData.reason;
    if (row.rawData.status === LabelStatus.REJECTED && rejectionReason) {
      additionalInfo.push({
        label: 'Motivo rechazo',
        value: rejectionReason
      });
    }

    // Continue with rest of the fields
    additionalInfo.push(
      { label: 'Origen', value: row.origin || 'N/A' },
      { label: 'Destino', value: row.destination || 'N/A' },
      { label: 'Área', value: row.rawData.areaName || 'N/A' },
      { label: 'Sección', value: row.rawData.sectionName || 'N/A' },
      { label: 'Tipo muestra', value: translatedSampleType },
      { label: 'Análisis', value: analysisName },
      { label: 'Fecha', value: row.date || 'N/A' },
      { label: 'Hora', value: row.time || 'N/A' },
      { label: 'Urgente', value: row.rawData.urgent === true ? 'Sí' : 'No' }
    );

    this.modalService.show({
      title: 'Detalle de la muestra',
      message: 'Información completa de la muestra seleccionada',
      type: 'info',
      additionalInfo: additionalInfo,
      actions: [
        {
          label: 'Cerrar',
          severity: 'secondary',
          returnValue: false
        }
      ]
    }, '600px').subscribe();
  }

  /**
   * Helper method to translate status using the same logic as sample-reception
   */
  private translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'PENDING': 'Pendiente',
      'COLLECTED': 'Recolectado',
      'IN_TRANSIT': 'En tránsito',
      'DELIVERED': 'Recibir',
      'PROCESSING': 'En proceso',
      'COMPLETED': 'Completado',
      'CANCELED': 'Cancelado',
      'IN_PREPARATION': 'En preparación',
      'DERIVED': 'Derivado',
      'LOST': 'Perdido',
      'REJECTED': 'Rechazado',
      'CREATED': 'Creado',
      'PRINTED': 'Impreso',
      'REPRINTED': 'Reimpreso'
    };
    return translations[status] || status;
  }

  /**
   * Handles confirmation button click in modal for previous state
   */
  onConfirmPreviousState(): void {
    const selectedRows = this.tableData.filter(row => row.selected);

    if (selectedRows.length === 0) {
      this.nextStateModalConfig = null;
      return;
    }

    const previousStatus = this.getPreviousStatus();

    if (!previousStatus) {
      this.nextStateModalConfig = null;
      return;
    }

    const labelIds = selectedRows.map(row => row.id);

    this.loading.set(true);
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
    // Use rollback endpoint instead of regular update to avoid 400 Bad Request from analytical-mng
    this.sampleService.rollbackLabelsStatus(labelIds, previousStatus).subscribe({
      next: () => {
        this.nextStateModalConfig = null;
        this.loading.set(false);
        this.showAlertMessage('success', this.getSampleOperationMessage(selectedRows.length, 'actualizado'));
        this.loadDataForSelectedOption(false);
      },
      error: () => {
        this.nextStateModalConfig = null;
        this.loading.set(false);
        this.showAlertMessage('error', 'No se pudo revertir el estado de las muestras. Por favor, inténtelo nuevamente.');
      }
    });
  }

  /**
   * Handles confirmation button click in modal
   */
  onConfirm(): void {
    const selectedRows = this.tableData.filter(row => row.selected);

    if (selectedRows.length === 0) {
      this.nextStateModalConfig = null;
      return;
    }

    const labelIds = selectedRows.map(row => row.id);
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
    // Pause polling while updating labels status to avoid race with full reload
    this.polling?.stop();
    // Special handling for discard operation
    if (this.selectedOption === 'to_discard') {
      this.loading.set(true);
      this.sampleService.discardLabels(labelIds).subscribe({
        next: () => {
          this.nextStateModalConfig = null;
          this.loading.set(false);
          this.showAlertMessage('success', this.getSampleOperationMessage(selectedRows.length, 'descartado'));
          this.loadDataForSelectedOption(false);
          // Restart polling after successful discard and reload
          this.initializePollingForOption(this.selectedOption);
        },
        error: (_error) => {
          this.nextStateModalConfig = null;
          this.loading.set(false);
          this.showAlertMessage('error', 'No se pudo descartar las muestras. Por favor, inténtelo nuevamente.');
          // Restart polling even on error
          this.initializePollingForOption(this.selectedOption);
        }
      });
      return;
    }

    const newStatus = this.getNextStatus();

    if (!newStatus) {
      this.nextStateModalConfig = null;
      // Restart polling if there is no valid next status
      this.initializePollingForOption(this.selectedOption);
      return;
    }

    this.loading.set(true);
    this.sampleService.updateLabelsStatus(labelIds, newStatus).subscribe({
      next: () => {
        this.nextStateModalConfig = null;
        this.loading.set(false);
        this.showAlertMessage('success', this.getSampleOperationMessage(selectedRows.length, 'actualizado'));
        this.loadDataForSelectedOption(false);
        // Restart polling after successful update and reload
        this.initializePollingForOption(this.selectedOption);
      },
      error: (_error) => {
        this.nextStateModalConfig = null;
        this.loading.set(false);
        this.showAlertMessage('error', 'No se pudo actualizar el estado de las muestras. Por favor, inténtelo nuevamente.');
      }
    });
    this.initializePollingForOption(this.selectedOption);
  }

  /**
   * Determines the previous status based on current slider selection
   * @returns The previous status to apply, or null if cannot determine
   */
  private getPreviousStatus(): LabelStatus | null {
    switch (this.selectedOption) {
    case 'sample_entry':
      return null; // No previous status for first state
    case 'to_prepare':
      return LabelStatus.COLLECTED;
    case 'to_transport':
      return LabelStatus.IN_PREPARATION;
    case 'to_receive':
      return LabelStatus.IN_TRANSIT;
    case 'to_process':
      return LabelStatus.DELIVERED;
    case 'in_derivation':
      return null; // No standard previous status for derivation
    case 'to_discard':
      return null; // No previous status for discarded samples
    default:
      return null;
    }
  }

  /**
   * Closes Next State modal
   */
  onReject(): void {
    this.nextStateModalConfig = null;
  }

  /**
   * Closes Next State modal
   */
  onModalClose(): void {
    this.nextStateModalConfig = null;
  }

  /**
   * Closes Reject modal
   */
  onCancelModalClose(): void {
    this.cancelRejectModalConfig = null;
  }

  /**
   * Closes Reject modal
   */
  onCancelModalReject(): void {
    this.cancelRejectModalConfig = null;
  }

  /**
   * Closes Detail modal and clears data
   */
  onDetailModalClose(): void {
    this.detailModalConfig = null;
    this.selectedRowDetail = null;
  }

  /**
   * Determines the next status based on current slider selection
   * @returns The next status to apply, or null if cannot determine
   */
  private getNextStatus(): LabelStatus | null {
    switch (this.selectedOption) {
    case 'sample_entry':
      return LabelStatus.IN_PREPARATION;
    case 'to_prepare':
      return LabelStatus.IN_TRANSIT;
    case 'to_transport':
      return LabelStatus.DELIVERED;
    case 'to_receive':
      return LabelStatus.PROCESSING;
    case 'to_process':
      return LabelStatus.COMPLETED;
    case 'in_derivation':
      return LabelStatus.COLLECTED;
    case 'to_discard':
      return null; // No next status for discarded samples
    default:
      return null;
    }
  }

  /**
   * Closes Mark as Lost modal and clears data
   */
  onMarkAsLostModalClose(): void {
    this.markAsLostModalConfig = null;
    this.selectedRowForLost = null;
    this.cancellationReason = '';
  }

  /**
   * Handles mark as lost action from table row
   * @param row - The row to mark as lost
   */
  onMarkAsLost(row: TableRowData): void {
    this.selectedRowForLost = row;
    this.cancellationReason = '';
    this.buildMarkAsLostModalConfig();
  }

  /**
   * Handles confirmation button click in mark as lost modal
   * Marks the label and its associated sample as lost with the provided reason
   */
  onMarkAsLostConfirm(): void {
    if (!this.selectedRowForLost) {
      this.markAsLostModalConfig = null;
      return;
    }

    // Validate that a reason was provided
    if (!this.cancellationReason.trim()) {
      this.showAlertMessage('warning', 'Debe ingresar un motivo para continuar.');
      return;
    }

    // Get user ID from localStorage
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      this.showAlertMessage('error', 'No se pudo obtener la información del usuario.');
      return;
    }

    const userId = JSON.parse(authUser).id;
    const labelId = this.selectedRowForLost.rawData.id;

    this.loading.set(true);
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
    // Pause polling while marking label as lost
    this.polling?.stop();
    this.labelService.markLabelAsLost(labelId, this.cancellationReason.trim(), userId).subscribe({
      next: () => {
        this.markAsLostModalConfig = null;
        this.selectedRowForLost = null;
        this.loading.set(false);
        this.cancellationReason = '';
        this.showAlertMessage('success', 'La muestra ha sido marcada como perdida correctamente.');
        this.loadDataForSelectedOption();
      },
      error: (error) => {
        this.markAsLostModalConfig = null;
        this.loading.set(false);
        const errorMessage = error.error?.message || error.message || 'No se pudo marcar la muestra como perdida. Por favor, inténtelo nuevamente.';
        this.showAlertMessage('error', errorMessage);
        // Restart polling even on error to keep UI synced
        this.initializePollingForOption(this.selectedOption);
      }
    });
  }

  /**
   * Handles confirmation button click in reject modal
   * Updates the status of selected samples to REJECTED
   */
  onCancelModalConfirm(): void {
    const selectedRows = this.tableData.filter(row => row.selected);

    if (selectedRows.length === 0) {
      this.cancelRejectModalConfig = null;
      return;
    }

    // Validate that a reason was provided
    if (!this.cancellationReason.trim()) {
      this.showAlertMessage('warning', 'Debe ingresar un motivo para continuar.');
      return;
    }

    const labelIds = selectedRows.map(row => row.id);

    this.loading.set(true);
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
    // Pause polling while rejecting labels to avoid race with full reload
    this.polling?.stop();
    // Use rejectLabels for REJECT action
    this.sampleService.rejectLabels(labelIds, this.cancellationReason.trim()).subscribe({
      next: () => {
        this.cancelRejectModalConfig = null;
        this.loading.set(false);
        this.cancellationReason = '';
        this.showAlertMessage('success', this.getSampleOperationMessage(selectedRows.length, 'rechazado'));
        this.loadDataForSelectedOption(false);
        // Restart polling after successful rejection and reload
        this.initializePollingForOption(this.selectedOption);
      },
      error: (_error) => {
        this.cancelRejectModalConfig = null;
        this.loading.set(false);
        this.showAlertMessage('error', 'No se pudo rechazar las muestras. Por favor, inténtelo nuevamente.');
        // Restart polling even on error
        this.initializePollingForOption(this.selectedOption);
      }
    });
  }

  /**
   * Generic method to show an alert message
   * @param type - Type of alert (success, error, warning)
   * @param message - Message to display
   * @param duration - Duration in milliseconds (default: 5000)
   */
  private showAlertMessage(type: AlertType, message: string, duration: number = 5000): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    this.alertType = type;
    this.alertMessage = message;
    this.showAlert = true;

    this.alertTimeout = setTimeout(() => {
      this.showAlert = false;
    }, duration);
  }

  /**
   * Helper method to generate success message for sample operations
   * @param count - Number of samples
   * @param action - Action performed ('actualizado' | 'cancelado' | 'rechazado')
   */
  private getSampleOperationMessage(count: number, action: 'actualizado' | 'cancelado' | 'rechazado' | 'descartado'): string {
    const verb = count === 1 ? `ha ${action}` : `han ${action}`;
    const noun = count === 1 ? 'muestra' : 'muestras';
    return `Se ${verb} ${count} ${noun} correctamente.`;
  }

  /** Removed helper methods - logic now inline in buildDetailModalConfig
   * Handles export to Excel or PDF
   * @param filteredData - Filtered data from the table
   * @param event - Export event with type
   */
  async onExport(filteredData: TableRowData[], event: ExportEvent): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const dataToExport = filteredData.length > 0 ? filteredData : this.tableData;
      let result;

      // Determine which columns to use based on the selected option
      const isTransport = this.selectedOption === 'transport';
      const excelColumns = isTransport
        ? PRE_ANALYTICAL_TRANSPORT_EXPORT_COLUMNS
        : PRE_ANALYTICAL_STANDARD_EXPORT_COLUMNS;
      const pdfColumns = isTransport
        ? PRE_ANALYTICAL_TRANSPORT_PDF_COLUMNS
        : PRE_ANALYTICAL_STANDARD_PDF_COLUMNS;

      // Get the current view label for file name
      const viewLabel = this.sliderOptions.find(opt => opt.value === this.selectedOption)?.label || 'muestras';
      const fileName = `pre_analitica_${viewLabel.toLowerCase().replace(/ /g, '_')}`;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: excelColumns,
          fileName: fileName,
          sheetName: viewLabel,
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: pdfColumns,
          fileName: fileName,
          title: `Pre-Analítica - ${viewLabel}`,
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
      }

      if (result?.success) {
        if (this.alertTimeout) {
          clearTimeout(this.alertTimeout);
        }
        this.alertType = 'success';
        this.alertMessage = 'Los datos se exportaron correctamente.';
        this.showAlert = true;
        this.alertTimeout = setTimeout(() => {
          this.showAlert = false;
        }, 5000);
      } else {
        if (this.alertTimeout) {
          clearTimeout(this.alertTimeout);
        }
        this.alertType = 'error';
        this.alertMessage = result?.error || 'No se pudo generar el archivo de exportación.';
        this.showAlert = true;
        this.alertTimeout = setTimeout(() => {
          this.showAlert = false;
        }, 5000);
      }
    } catch {
      if (this.alertTimeout) {
        clearTimeout(this.alertTimeout);
      }
      this.alertType = 'error';
      this.alertMessage = 'No se pudo generar el archivo de exportación.';
      this.showAlert = true;
      this.alertTimeout = setTimeout(() => {
        this.showAlert = false;
      }, 5000);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Gets the branch ID from the authenticated user stored in localStorage
   * Safely parses the auth_user JSON and validates the branch field
   * @returns The branch ID as a number, or null if not found or invalid
   * @private
   */
  private getAuthUserBranchFromStorage(): number | null {
    const authUserStr = localStorage.getItem('auth_user');
    if (!authUserStr) return null;

    try {
      const authUser = JSON.parse(authUserStr);
      const branch = authUser?.branch;
      if (branch === undefined || branch === null) return null;
      const branchNum = Number(branch);
      return Number.isNaN(branchNum) ? null : branchNum;
    } catch (_e) {
      return _e instanceof SyntaxError ? null : null;
    }
  }

  /**
   * Handles destination branch change for a label.
   * Called when user selects a destination branch from the dropdown.
   * Opens a modal to request reason and notes before sending to branch.
   * @param row - The table row containing label data
   * @param newDestinationId - The new destination branch ID
   */
  onDestinationChange(row: TableRowData, newDestinationId: number): void {
    if (!newDestinationId || !row.rawData.id) {
      return;
    }

    // Don't make API call if the value hasn't actually changed
    if (row.rawData.destinationBranchId && newDestinationId === row.rawData.destinationBranchId) {
      return;
    }

    // Prevent setting destination same as origin
    if (newDestinationId === row.rawData.originBranchId) {
      this.showAlertMessage('error', 'El destino no puede ser igual al origen');
      // Revert the change in UI
      row.destinationId = row.rawData.destinationBranchId ?? null;
      return;
    }

    // Store the row and destination for later use in modal
    this.selectedRowForDestination = row;
    this.newDestinationBranchId = newDestinationId;

    // Open modal to request reason and notes
    this.openSendToBranchModal();
  }

  /**
   * Opens modal to request reason and notes for sending to branch
   */
  private openSendToBranchModal(): void {
    const destinationName = this.newDestinationBranchId
      ? this.branchMap.get(this.newDestinationBranchId) || 'desconocido'
      : 'desconocido';

    // Reset reason
    this.cancellationReason = '';

    // Get analysis name from the selected row
    const rawData = this.selectedRowForDestination?.rawData;
    let analysisName = 'N/A';

    if (rawData?.analysisName) {
      // Use analysisName directly from backend if available
      analysisName = this.formatAnalysisName(rawData.analysisName);
    } else if (rawData?.analysisId) {
      // Fallback: lookup in analysisMap using analysisId
      const name = this.analysisMap.get(rawData.analysisId);
      if (name) {
        analysisName = this.formatAnalysisName(name);
      }
    }

    this.sendToBranchModalConfig = {
      visible: true,
      title: `Enviar muestra a ${destinationName}`,
      width: '500px',
      fields: [
        {
          label: 'Análisis:',
          value: analysisName,
          fullWidth: true
        }
      ],
      textarea: {
        placeholder: 'Ingrese el motivo del envío...',
        rows: 3
      },
      showCloseButton: false,
      buttons: [
        {
          label: 'Cancelar',
          type: 'secondary',
          action: () => this.closeSendToBranchModal()
        },
        {
          label: 'Confirmar',
          type: 'primary',
          action: () => this.confirmSendToBranch()
        }
      ],
      onClose: () => this.closeSendToBranchModal()
    };
  }

  /**
   * Closes send to branch modal and resets state
   */
  private closeSendToBranchModal(): void {
    this.sendToBranchModalConfig = null;
    // Revert the change in UI
    if (this.selectedRowForDestination) {
      this.selectedRowForDestination.destinationId = this.selectedRowForDestination.rawData.destinationBranchId ?? null;
    }
    this.selectedRowForDestination = null;
    this.newDestinationBranchId = null;
    this.cancellationReason = '';
  }

  /**
   * Confirms sending the sample to the selected branch
   */
  private confirmSendToBranch(): void {
    if (!this.selectedRowForDestination || !this.newDestinationBranchId) {
      return;
    }

    // Validate that a reason was provided
    if (!this.cancellationReason.trim()) {
      this.showAlertMessage('warning', 'Debe ingresar un motivo para continuar.');
      return;
    }

    const row = this.selectedRowForDestination;
    const destinationId = this.newDestinationBranchId;

    this.labelService.sendToBranch(
      row.rawData.id,
      destinationId,
      this.cancellationReason.trim(),
      '' // notes - empty for now
    )
      .pipe(takeUntil(this.cancelPendingRequests$))
      .subscribe({
        next: () => {
          this.showAlertMessage('success', 'Muestra enviada correctamente');
          // Update the row data
          row.rawData.destinationBranchId = destinationId;
          row.destinationId = destinationId;
          // Update destination name in table
          const branchName = this.branchMap.get(destinationId);
          if (branchName) {
            row.destination = branchName;
          }
          // Close modal
          this.closeSendToBranchModal();
        },
        error: (error) => {
          // Try to extract error message from backend
          let errorMessage = 'Error al enviar la muestra';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }

          this.showAlertMessage('error', errorMessage);
          // Don't close modal so user can retry
        }
      });
  }

  /**
   * Focus on the search input in the generic table
   */
  private focusSearchInput(): void {
    setTimeout(() => {
      if (this.genericTableComponent) {
        const searchInput = (window as any).document.querySelector('app-generic-table input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }, 100);
  }
}
