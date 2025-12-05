import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
  signal
} from '@angular/core';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Accordion, AccordionPanel } from 'primeng/accordion';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import {
  GenericFormComponent,
  GenericFormField
} from '../../../../shared/components/generic-form/generic-form.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import {
  TutorialOverlayComponent as GenericTutorialComponent
} from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { PrimeModalService } from '../../../../shared/components/modal/prime-modal.service';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { CashMovementService } from '../../../billing-collections/cash-management/application/cash-movement.service';
import { InsurerAndDateFilter } from '../../models/insurer-and-date-filter.model';
import { InsurerResponseDTO } from '../../models/insurer.model';
import { SettlementTableItem } from '../../models/settlement.model';
import { DateArrayPipe } from '../../pipes/date-array.pipe';
import { SettlementLabelPipe } from '../../pipes/settlement-label.pipe';
import { InsurerService } from '../../services/insurer.service';
import { SettlementService } from '../../services/settlement.service';

import { SETTLEMENT_EXPORT_COLUMNS, SETTLEMENT_PDF_COLUMNS } from './settlement-export-config';

/**
 * PaymentFormValue
 */
interface PaymentFormValue {
  amount: number;
  paymentMethod: string;
  concept: string;
  receiptNumber?: string;
  observations?: string;
  liquidationId: number;
}

/**
 * SettlementHomeComponent
 * Component for the settlement home page, listing all settlements.
 */
@Component({
  selector: 'app-settlement-home',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericBadgeComponent,
    GenericTableComponent,
    GenericFormComponent,
    GenericModalComponent,
    FormsModule,
    Accordion,
    AccordionPanel,
    PrimeTemplate,
    GenericTutorialComponent,
    SpinnerComponent
  ],
  templateUrl: './settlement-home.component.html',
  styleUrl: './settlement-home.component.css'
})
export class SettlementHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  showModal = false;
  showCobrarModal = false;
  date: Date | null = null;
  observations: string = '';
  selectedSettlementId: number | null = null;
  showConfirmModal = false;
  showCancelModal = false;
  confirmInitialValue: { informedDate?: Date; informedAmount?: number; observations?: string; } = {};
  cancelInitialValue: { observations?: string; } = {};

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private settlementService = inject(SettlementService);
  private insurerService = inject(InsurerService);
  private datePipe = new DateArrayPipe();
  private labelPipe = new SettlementLabelPipe();
  private cd = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private readonly modalService = inject(PrimeModalService);
  private readonly movementService = inject(CashMovementService);
  cobrarInitialValue: Record<string, any> = {};
  private tutorialService = inject(TutorialService);
  private http = inject(HttpClient);

  /** Lista lista para la tabla */
  settlements: SettlementTableItem[] = [];

  /** Filtros activos */
  filtros: InsurerAndDateFilter = {
    insurerId: null,
    dateFrom: null,
    dateTo: null
  };

  /** breadcrumbService. */
  readonly breadcrumbService = inject(BreadcrumbService);
  readonly pageTitleService = inject(PageTitleService);

  loading = signal<boolean>(false);


  /** Alerta temporal */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** Table filters: insurer and date */
  tableFilters: Filter[] = [
    {
      id: 'insurerId',
      type: 'select',
      label: 'Aseguradora',
      filterConfig: { searchBar: true },
      options: []
    },
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Periodo',
      dateFrom: null,
      dateTo: null
    }
  ];

  /** Column templates map for custom cell rendering */
  columnTemplates = new Map<string, TemplateRef<any>>();
  @ViewChild('selectTpl', { read: TemplateRef }) selectTpl?: TemplateRef<any>;
  @ViewChild('actionsTpl', { read: TemplateRef }) actionsTpl?: TemplateRef<any>;

  /** TemplateRef captured for status badge cell */
  @ViewChild('statusBadgeTpl', { read: TemplateRef }) statusBadgeTpl?: TemplateRef<any>;

  /** Reference to GenericTable component to access filtered data */
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;
  /** Reference to the generic tutorial overlay component */
  @ViewChild('tutorialOverlay') tutorialOverlay?: GenericTutorialComponent;

  /** Tutorial config describing steps for this page */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Liquidaciones',
        message: 'En esta tabla verás la aseguradora, tipo, período, cantidad de prestaciones, total e estado.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros',
        message: 'Filtrá por aseguradora y período.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda',
        message: 'Buscá liquidaciones por texto.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Descargar',
        message: 'Exportá la tabla a Excel o PDF.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Nueva liquidación',
        message: 'Creá una nueva liquidación desde aquí.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Abrí el menú para ver las acciones disponibles para una fila.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Podés Confirmar, Anular, Cobrar, o Descargar Excel según el estado.',
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
      if (document.querySelector('.p-popover-content')) document.body.click();
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) document.body.click();
    }
  });

  /** Subscription to the tutorial trigger */
  private tutorialSub?: Subscription;

  columns = [
    { field: 'insurerAcronym', header: 'Aseguradora', sortable: true },
    { field: 'type', header: 'Tipo', sortable: true },
    { field: 'period', header: 'Periodo', sortable: true },
    { field: 'providedServicesCount', header: 'Prestaciones', sortable: true },
    {
      field: 'informedAmount', header: 'Total', sortable: true, pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.2-2'] }
        ]
    },
    { field: 'status', header: 'Estado', sortable: true }
  ];

  confirmFields: GenericFormField[] = [
    {
      name: 'informedDate',
      label: 'Fecha informada',
      type: 'date',
      required: true,
      dateFormat: 'dd/mm/yy',
      maxDate: new Date(),
      messages: {
        required: 'La fecha es obligatoria.',
        dateMax: 'La fecha no puede ser mayor a hoy.'
      },
      colSpan: 2
    },
    {
      name: 'informedAmount',
      label: 'Monto informado',
      type: 'number',
      required: true,
      min: 0,
      colSpan: 2,
      addonLeft: '$',
      messages: {
        required: 'El monto es obligatorio.',
        min: 'El monto debe ser mayor a 0.'
      }
    },
    {
      name: 'observations',
      label: 'Observaciones',
      type: 'textarea',
      rows: 8,
      colSpan: 4,
      maxLength: 255
    }
  ];

  cancelFields: GenericFormField[] = [
    {
      name: 'observations',
      label: 'Observaciones',
      type: 'textarea',
      required: true,
      rows: 6,
      colSpan: 4
    }
  ];

  /**
   * Fields for the payment form
   */
  cobrarFields: GenericFormField[] = [
    {
      name: 'amount',
      label: 'Monto',
      type: 'number',
      required: true,
      min: 0.01,
      addonLeft: '$',
      hint: 'Ingrese el monto del pago',
      colSpan: 2,
      messages: {
        required: 'El monto es obligatorio.',
        min: 'El monto debe ser mayor a 0.'
      }
    },
    {
      name: 'paymentMethod',
      label: 'Método de pago',
      type: 'select',
      required: true,
      appendTo: 'body',
      options: [
        { label: 'Efectivo', value: 'Efectivo' },
        { label: 'Tarjeta Débito', value: 'Tarjeta Debito' },
        { label: 'Tarjeta Crédito', value: 'Tarjeta Credito' },
        { label: 'Transferencia', value: 'Transferencia' }
      ],
      colSpan: 2,
      messages: {
        required: 'El método de pago es obligatorio.'
      }
    },
    {
      name: 'concept',
      label: 'Concepto',
      type: 'text',
      required: true,
      colSpan: 2,
      messages: {
        required: 'El concepto es obligatorio.'
      }
    },
    {
      name: 'receiptNumber',
      label: 'N° de comprobante',
      type: 'text',
      colSpan: 2
    },
    {
      name: 'customer',
      label: 'Cliente/Obra Social',
      type: 'text',
      colSpan: 4
    },
    {
      name: 'observations',
      label: 'Observaciones',
      type: 'textarea',
      rows: 3,
      colSpan: 4,
      maxLength: 500,
      hint: 'Máximo 500 caracteres'
    }
  ];


  /**
   * Fields for the collection summary (read-only)
   */
  get cobrarSummaryFields(): GenericFormField[] {
    return [
      {
        name: 'summaryInsurer',
        label: 'Obra Social',
        type: 'text',
        disabled: true,
        colSpan: 1
      },
      {
        name: 'summaryPeriod',
        label: 'Período',
        type: 'text',
        disabled: true,
        colSpan: 1
      },
      {
        name: 'summaryAmount',
        label: 'Monto liquidado',
        type: 'text',
        disabled: true,
        colSpan: 1
      },
      {
        name: 'summaryServices',
        label: 'Servicios',
        type: 'text',
        disabled: true,
        colSpan: 1
      }
    ];
  }

  /**
   * Initial value of the payment summary
   */
  get cobrarSummaryValue() {
    const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
    return {
      summaryInsurer: this.selectedSettlement?.insurerAcronym || '—',
      summaryPeriod: this.selectedSettlement
        ? `${this.selectedSettlement.periodStart} a ${this.selectedSettlement.periodEnd}`
        : '—',
      summaryAmount: this.selectedSettlement
        ? currency.format(this.selectedSettlement.informedAmount)
        : '—',
      summaryServices: this.selectedSettlement?.providedServicesCount?.toString() || '—'
    };
  }

  /**
   * Maps human-readable settlement status to a GenericBadgeComponent status token.
   */
  badgeStatusFrom(statusText: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
    const normalized = (statusText || '').toLowerCase();
    // Pending, Informed, Billed, Cancel
    if (normalized.includes('pend')) return 'pendiente';
    if (normalized.includes('inform')) return 'completo';
    if (normalized.includes('factur')) return 'verificado';
    if (normalized.includes('anul')) return 'inactivo';
    return 'pendiente';
  }

  /**
   *  ngOnInit.
   */
  ngOnInit(): void {
    try {
      localStorage.removeItem('settlementNewDraft');
      localStorage.removeItem('settlementState');
    } catch {
    }
    this.pageTitleService.setTitle('Liquidaciones');
    this.breadcrumbService.buildFromRoute(this.route);

    const nav = this.router.getCurrentNavigation();
    const created = nav?.extras?.state && (nav.extras.state as any).settlementCreated;
    if (created) {
      setTimeout(() => this.showAlert('success', 'La liquidación fue generada con éxito.'), 0);
    }

    this.loadInsurers();
    this.setInitialLastThreeMonthsRange();
    this.loadSettlements();

    // Subscribe to global tutorial trigger (navbar emits full URL)
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (route.includes('coverage-administration')) {
        this.startSettlementTutorial();
      }
    });
  }

  /**
   * After view initialization hook.
   * Wires the custom badge template to the 'status' column.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.statusBadgeTpl) {
        this.columnTemplates.set('status', this.statusBadgeTpl);
      }
    });
  }

  /** Cleanup */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /** Starts tutorial; injects a mock row if table is empty so selectors resolve */
  private startSettlementTutorial(): void {
    if (!this.settlements || this.settlements.length === 0) {
      this.injectTutorialMock();
    }
    setTimeout(() => this.tutorialOverlay?.start(), 300);
  }

  /** Adds a temporary mock settlement row for the tutorial */
  private injectTutorialMock(): void {
    const mock: SettlementTableItem = {
      id: -1,
      insurerId: 0,
      insurerName: 'Cobertura Demo',
      insurerAcronym: 'DEMO',
      type: 'Simple',
      periodStart: '01/10/2025',
      periodEnd: '31/10/2025',
      status: 'Pendiente',
      observations: '—',
      providedServicesCount: 12,
      informedDate: undefined,
      informedAmount: 123456.78,
      liquidatedPlans: [
        { name: 'Plan General', subtotal: 80000, providedServicesCount: 8 },
        { name: 'Plan Especial', subtotal: 43456.78, providedServicesCount: 4 }
      ]
    };
    this.settlements = [mock];
    this.cd.detectChanges();
  }

  /**
   * Loads the list of insurers for the filter dropdown.
   * Sets the first option as "All" and marks it as active by default.
   */
  private loadInsurers(): void {
    this.insurerService.getAllSimpleInsurers().subscribe({
      next: (data: InsurerResponseDTO[]) => {
        const options = [
          { label: 'Todas', value: null, active: true },
          ...data.map((i: any) => ({ label: i.name, value: i.id, active: false }))
        ];

        this.tableFilters = this.tableFilters.map(f =>
          f.id === 'insurerId' ? { ...f, options } : f
        );

      },
      error: () => {
        const options = [{ label: 'Todas', value: null, active: true }];
        this.tableFilters = this.tableFilters.map(f =>
          f.id === 'insurerId' ? { ...f, options } : f
        );

      }
    });
  }

  /**
   * Sets the default date range for the filter (last 3 months, inclusive).
   */
  private setInitialLastThreeMonthsRange(): void {
    const dateTo = new Date();
    const dateFrom = new Date();
    // Retrocede 3 meses manteniendo el día; si el día no existe (casos fin de mes) Date ajusta automáticamente.
    dateFrom.setMonth(dateFrom.getMonth() - 3);

    // Actualiza estructura visual (tableFilters) y el estado interno (filtros)
    this.tableFilters = this.tableFilters.map(f =>
      f.id === 'dateRange'
        ? { ...f, dateFrom, dateTo }
        : f
    );
    this.filtros.dateFrom = dateFrom;
    this.filtros.dateTo = dateTo;
  }

  /** Shows a temporal alert in the screen */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  /**
   * Calls the service with the current filters, transforms the data using pipes,
   * and prepares the SettlementTableItem interface for the table.
   */
  private loadSettlements(): void {
    const { insurerId, dateFrom, dateTo } = this.filtros;
    // Formateo manual (evita desfasajes UTC de toISOString que puede retroceder un día en zonas GMT-3).
    const formatDate = (d?: Date | null): string | undefined => d ? `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}` : undefined;

    const fFrom = formatDate(dateFrom);
    const fTo = formatDate(dateTo);

    this.loading.set(true);

    // DEBUG temporal (remover en producción) parámetros enviados
    // insurerId: ${insurerId} dateFrom: ${fFrom} dateTo: ${fTo}

    this.settlementService
      .getAllSettlements(insurerId ?? undefined, fFrom, fTo)
      .subscribe({
        next: (data) => {
          this.settlements = (data ?? []).map(item => {
            const insurer = item.insurer;
            const isSimple = (item.type || '').toUpperCase() === 'SIMPLE';
            const liquidatedPlans = (item.plansProvidedServices || []).map(p => {
              const name = p.plan?.name || p.plan?.acronym || p.plan?.code || '—';
              if (isSimple) {
                const subtotal = (p.settlementAgreements || []).reduce((acc, a) => acc + (a.subtotal || 0), 0);
                const count = (p.settlementAgreements || []).reduce((acc, a) => acc + (a.providedServicesCount || 0), 0);
                return { name, subtotal, providedServicesCount: count };
              } else {
                const subtotal = (p.planRules || []).reduce((acc, r) => acc + (r.subtotal || 0), 0);
                const count = (p.planRules || []).reduce((acc, r) => acc + (r.providedServicesCount || 0), 0);
                return { name, subtotal, providedServicesCount: count };
              }
            });

            return {
              id: item.id,
              insurerId: insurer?.id ?? 0,
              insurerName: insurer?.name ?? '',
              insurerAcronym: insurer?.acronym ?? '',
              type: this.labelPipe.transform(item.type, 'type'),
              periodStart: this.datePipe.transform(item.periodStart) || 'Fecha no disponible',
              periodEnd: this.datePipe.transform(item.periodEnd) || 'Fecha no disponible',
              period: `${this.datePipe.transform(item.periodStart) || 'N/A'} - ${this.datePipe.transform(item.periodEnd) || 'N/A'}`,
              status: this.labelPipe.transform(item.status, 'status'),
              observations: item.observations,
              providedServicesCount: item.totalProvidedServices ?? 0,
              informedDate: item.informedDate,
              informedAmount: item.informedAmount ?? 0,
              liquidatedPlans
            };
          });
          this.loading.set(false);
          this.cd.detectChanges();
        },
        error: () => {
          this.showAlert('error', 'Error al cargar las liquidaciones.');
          this.loading.set(false);
        }
      });
  }

  /** Executes when filter changes. */
  onTableFilterChange(event: FilterChangeEvent) {
    /**
     * Nueva implementación: GenericTable emite { filters: [...], activeCount }.
     * Antes se intentaba leer event.insurerId y event.dateRange directamente y fallaba.
     */
    const insurerFilter = event.filters.find(f => f.id === 'insurerId');
    const dateRangeFilter = event.filters.find(f => f.id === 'dateRange');

    // Actualizar insurerId
    if (insurerFilter) {
      this.filtros.insurerId = (insurerFilter.value as number | null) ?? null;
      // Reflejar estado activo en las opciones visuales
      this.tableFilters = this.tableFilters.map(tf => {
        if (tf.id === 'insurerId' && tf.options) {
          return {
            ...tf,
            options: tf.options.map(opt => ({ ...opt, active: opt.value === insurerFilter.value }))
          };
        }
        return tf;
      });
    } else {
      // Si se limpian filtros y no viene insurerId, dejar en null y marcar "Todas" activa
      this.filtros.insurerId = null;
      this.tableFilters = this.tableFilters.map(tf => {
        if (tf.id === 'insurerId' && tf.options) {
          return {
            ...tf,
            options: tf.options.map(opt => ({ ...opt, active: opt.value === null }))
          };
        }
        return tf;
      });
    }

    // Actualizar rango de fechas
    if (dateRangeFilter) {
      const from = (dateRangeFilter as any).dateFrom ?? null;
      const to = (dateRangeFilter as any).dateTo ?? null;
      this.filtros.dateFrom = from;
      this.filtros.dateTo = to;
      this.tableFilters = this.tableFilters.map(tf => tf.id === 'dateRange' ? { ...tf, dateFrom: from, dateTo: to } : tf);
    } else {
      // Si no hay filtro de fecha activo, mantener las fechas actuales (o limpiarlas si se desea)
      // Aquí decidimos limpiar para respetar el evento vacío.
      this.filtros.dateFrom = null;
      this.filtros.dateTo = null;
      this.tableFilters = this.tableFilters.map(tf => tf.id === 'dateRange' ? { ...tf, dateFrom: null, dateTo: null } : tf);
    }

    this.loadSettlements();
  }

  /**
   * Navigates to the settlement creation page.
   */
  onAddClicked(): void {

    this.router.navigate(['../new'], { relativeTo: this.route });
  }

  /** Row actions for GenericTable */
  getActions = (row: SettlementTableItem): MenuItem[] => {
    const baseActions: MenuItem[] = [
      {
        id: 'confirm',
        label: 'Confirmar',
        icon: 'pi pi-check',
        command: () => this.openConfirmModal(row)
      },
      {
        id: 'cancelConfirm',
        label: 'Anular',
        icon: 'pi pi-times',
        command: () => this.openCancelModal(row)
      },
      {
        id: 'cobrar',
        label: 'Cobrar',
        icon: 'pi pi-money-bill',
        command: () => this.onCobrarClicked(row.id)
      },
      {
        id: 'downloadExcel',
        label: 'Descargar Excel',
        icon: 'pi pi-file-excel',
        command: () => this.onDownloadExcel(row.id)
      }
    ];

    const status = row.status;
    if (status === 'Pendiente') {
      return baseActions.filter(a => a.id !== 'cobrar');
    }
    if (status === 'Informada') {
      return baseActions.filter(a => a.id !== 'confirm');
    }
    return baseActions.filter(a => a.id === 'downloadExcel');
  };

  /** Build display rows including currency string and period */
  get rows() {
    const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
    return (this.settlements ?? []).map(s => ({
      ...s,
      period: `${s.periodStart} - ${s.periodEnd}`,
      informed_amount_display: currency.format(Number(s.informedAmount ?? 0))
    }));
  }

  /**
   * Flag to prevent multiple simultaneous Excel downloads.
   */
  private isDownloadingExcel = false;

  /**
   * Downloads the Excel file for a given settlement row.
   * @param settlementId Settlement identifier used to request the file.
   */
  onDownloadExcel(settlementId: number): void {
    if (this.isDownloadingExcel) {
      return;
    }

    const settlement = this.settlements.find(s => s.id === settlementId);
    const insurerAcronym = settlement?.insurerAcronym || 'SinAcrónimo';
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear());
    const formattedDate = `${year}-${month}-${day}`;

    const safeAcronym = insurerAcronym.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${formattedDate}-liquidacion-${safeAcronym}-.xlsx`;

    this.isDownloadingExcel = true;

    this.settlementService.downloadSettlementExcel(settlementId).subscribe({
      next: (file: Blob) => {
        const blobUrl = window.URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(blobUrl);
        this.isDownloadingExcel = false;
      },
      error: () => {
        this.isDownloadingExcel = false;
      }
    });
  }

  /**
   * Opens the modal dialog for informing a Settlement.
   */
  openConfirmModal(row: SettlementTableItem): void {
    this.selectedSettlementId = row.id;

    this.confirmInitialValue = {
      informedDate: new Date(),
      informedAmount: row.informedAmount ?? null,
      observations: ''
    };

    this.showConfirmModal = true;
  }


  /**
   * Opens the modal dialog for annulled a Settlement.
   */
  openCancelModal(row: SettlementTableItem) {
    this.selectedSettlementId = row.id;

    this.cancelInitialValue = {
      observations: ''
    };

    this.showCancelModal = true;
  }

  /**
   * Save (informs) the selected settlement.
   */
  save(): void {
    if (!this.selectedSettlementId || !this.date) return;

    const formattedDate = this.date.toISOString().split('T')[0];

    this.settlementService
      .informSettlement(
        this.selectedSettlementId,
        0,
        formattedDate,
        this.observations || ''
      )
      .subscribe({
        next: () => {
          this.showModal = false;
          this.observations = '';
          this.date = null;

          this.loadSettlements();
          this.showAlert('success', 'Se ha informado correctamente.');
        },
        error: () => {
          this.showAlert('error', 'No se pudo informar');
        }
      });
  }

  /**
   * Get filtered data for export (from GenericTable's internal filtered data)
   */
  private getFilteredDataForExport(): SettlementTableItem[] {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as SettlementTableItem[];
    }
    // Fallback to all settlements if table not available
    return this.settlements;
  }

  /**
   * Export settlements to Excel
   */
  async onExportExcel(): Promise<void> {
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: SETTLEMENT_EXPORT_COLUMNS,
        fileName: 'liquidaciones',
        sheetName: 'Liquidaciones',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('success', 'Las liquidaciones se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Export settlements to PDF
   */
  async onExportPdf(): Promise<void> {
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: SETTLEMENT_PDF_COLUMNS,
        fileName: 'liquidaciones',
        title: 'Listado de Liquidaciones',
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
        this.showAlert('success', 'Las liquidaciones se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    }
  }


  /**
   * Save (informs) the selected settlement confirm
   */
  onConfirmSubmit(
    formValue: { informedDate: string; informedAmount: number; observations: string }
  ): void {
    if (!this.selectedSettlementId) return;

    this.settlementService
      .informSettlement(
        this.selectedSettlementId,
        formValue.informedAmount ?? 0,
        formValue.informedDate ?? '',
        formValue.observations ?? ''
      )
      .subscribe({
        next: () => {
          this.showConfirmModal = false;
          this.loadSettlements();
          this.showAlert('success', 'Se ha informado correctamente.');
        },
        error: () => this.showAlert('error', 'No se pudo informar')
      });
  }


  /**
   * Save (informs) the selected settlement cancelled
   */
  onCancelSubmit(formValue: { observations: string }): void {
    if (!this.selectedSettlementId) return;

    this.settlementService
      .cancelSettlement(
        this.selectedSettlementId,
        formValue.observations
      )
      .subscribe({
        next: () => {
          this.showCancelModal = false;
          this.loadSettlements();
          this.showAlert('success', 'La liquidación fue anulada correctamente.');
        },
        error: () => this.showAlert('error', 'No se pudo anular la liquidación')
      });
  }

  /**
   * Get the selected settlement
   */
  get selectedSettlement(): SettlementTableItem | undefined {
    if (!this.selectedSettlementId) return undefined;
    return this.settlements.find(s => s.id === this.selectedSettlementId);
  }

  /**
   * Send the payment (deposit) form
   */
  onCobrarSubmit(formValue: PaymentFormValue): void {
    if (!this.selectedSettlementId) return;

    this.movementService.registerLiquidationDeposit(
      {
        paymentMethod: formValue.paymentMethod,
        amount: formValue.amount,
        concept: formValue.concept,
        observations: formValue.observations,
        receiptNumber: formValue.receiptNumber,
        liquidationId : this.selectedSettlementId
      }
    ).subscribe({
      next: () => {
        this.modalService.success(
          '¡Pago registrado!',
          'Pago vinculado correctamente a la liquidación.',
          true,
          1500
        );
        this.onCobrarCancel();
        this.loadSettlements();
      },
      error: () => {
        this.modalService.error(
          '¡Aviso incompleto!',
          'El pago se registró pero NO se pudo notificar a Coberturas.'
        );
      }
    });
  }


  /**
   * selectedPaymentMethod
   */
  private selectedPaymentMethod(front: string) {
    const map: any = {
      'Efectivo': 'CASH',
      'Tarjeta Debito': 'DEBIT_CARD',
      'Tarjeta Credito': 'CREDIT_CARD',
      'Transferencia': 'TRANSFER',
      'QR': 'QR'
    };
    return map[front] || 'CASH';
  }


  /**
   * Open the payment modal
   */
  onCobrarClicked(settlementId: number): void {
    this.selectedSettlementId = settlementId;

    this.cobrarInitialValue = {
      amount: this.selectedSettlement?.informedAmount || 0,
      paymentMethod: null,
      customer: this.selectedSettlement?.insurerAcronym || '',
      concept: this.selectedSettlement
        ? `Liquidación ${this.selectedSettlement.insurerAcronym}`
        : '',
      receiptNumber: '',
      observations: ''
    };

    this.showCobrarModal = true;
  }

  /**
   * Close the payment modal
   */
  onCobrarCancel(): void {
    this.showCobrarModal = false;
    this.selectedSettlementId = null;
    this.cobrarInitialValue = {};
  }

}
