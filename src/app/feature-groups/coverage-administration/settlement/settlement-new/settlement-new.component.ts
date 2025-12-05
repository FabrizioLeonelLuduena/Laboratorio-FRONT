import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { DatePicker } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { Select, SelectChangeEvent } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { map } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { GenericColumn } from '../../../../shared/models/generic-table.models';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { InsurerCompleteResponseDTO, InsurerResponseDTO } from '../../models/insurer.model';
import { PlanRulesPayload, SettlementSpecialRulesDTO } from '../../models/rules.model';
import {
  ProvidedServiceTableItemDTO,
  SettlementCompleteResponseDTO, SettlementCreateRequestDTO,
  SettlementPreviewRequestDTO,
  SettlementResumeDTO,
  ProvidedServicesExclusionEvent
} from '../../models/settlement.model';
import { InsurerService } from '../../services/insurer.service';
import { NbuService } from '../../services/nbu.service';
import { SettlementService } from '../../services/settlement.service';
import { SettlementDetailsProvidedComponent } from '../settlement-details-provided/settlement-details-provided.component';
import { SpecialRulesComponent } from '../special-rules/special-rules.component';


/**
 * Component for creating a new settlement agreement.
 */
@Component({
  selector: 'app-settlement-new',
  standalone: true,
  templateUrl: 'settlement-new.component.html',
  styleUrl: 'settlement-new.component.css',
  imports: [
    FormsModule,
    DropdownModule,
    CalendarModule,
    SkeletonModule,
    GenericTableComponent,
    GenericButtonComponent,
    CurrencyPipe,
    Select,
    DatePicker,
    GenericAlertComponent,
    SpecialRulesComponent,
    GenericBadgeComponent,
    GenericModalComponent,
    SettlementDetailsProvidedComponent
  ]
})
export class SettlementNewComponent implements OnInit {

  /**
   * Constructor. Injects all required services for settlement creation.
   * @param router Angular Router for navigation
   * @param route ActivatedRoute for route context
   * @param insurerService Service for insurer data
   * @param settlementService Service for settlement operations
   * @param nbuService Service for NBU options
   */
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private insurerService: InsurerService,
    private settlementService: SettlementService,
    private nbuService: NbuService
  ) {}

  loading = false;
  availablePlans: { id: number; name: string }[] = [];
  searchStatus: 'inicial' | 'noEncontrado' | 'buscando' | 'completado' = 'inicial';
  specialRulesPayload: Array<{ planId: number; rules: any[] }> = [];
  loadedRules = false;
  loadedRulesPayload: PlanRulesPayload[] = [];

  /** Estado del modal de generación */
  showGeneratingModal = false;
  /** Flag de proceso de generación en curso */
  isGenerating = false;

  /** Tiempo mínimo visible del modal de generación (ms) */
  private readonly GENERATION_MIN_MS = 2000;

  /**
   * breadcrumbService.
   */
  readonly breadcrumbService = inject(BreadcrumbService);

  filtros = {
    insurerId: null,
    fechaDesde: null,
    fechaHasta: null,
    tipoLiquidacion: null
  };

  tiposLiquidacion = [
    { label: 'Común', value: 'comun' },
    { label: 'Especial', value: 'especial' }
  ];

  insurersOptions: { label: string; value: number | null }[] = [];

  nbuVersions: Array<{ id?: any; value?: any; label?: string; name?: string }> = [];

  /** Full settlement response (preview or created) */
  fullSettlement: SettlementCompleteResponseDTO | null = null;
  /** IDs de prestaciones excluidas seleccionadas (protocol ids) */
  excludedProvidedServicesIds: number[] = [];

  /** Currently viewing provided services detail for an agreement */
  viewingProvidedServicesFor: {
    baseKey: string;
    pageCount: number;
    agreementIndex: number; // index in the current table row
  } | null = null;

  /** Map of excluded services per baseKey */
  excludedServicesByKey: Record<string, Set<number>> = {};

  // Table state
  /** Selected services for exclusion */
  selectedIds = new Set<number>();
  excludedCount = 0;

  /** IDs already excluded from the main draft */
  private excludedIdsPersisted: Set<number> = new Set<number>();
  /** Exclusion map by baseKey to avoid dragging between settlements */
  private exclusionsByKey: Record<string, number[]> = {};
  /** Currently displayed page index */
  private currentPage = 0;

  /**
   * Returns the type in backend enum format: SIMPLE | ESPECIAL
   */
  private getSettlementType(): 'SIMPLE' | 'ESPECIAL' {
    return this.filtros.tipoLiquidacion === 'especial' ? 'ESPECIAL' : 'SIMPLE';
  }

  /**
   * Builds the special rules payload from the local state.
   */
  private buildSpecialRulesPayload(): SettlementSpecialRulesDTO[] {
    return this.specialRulesPayload
      ? this.specialRulesPayload.flatMap(group =>
        group.rules.map((rule): SettlementSpecialRulesDTO => ({
          type: rule.type,
          description: rule.description ?? '',
          analysisId: rule.analysisId ?? 0,
          minQuantity: rule.minQuantity ?? 0,
          maxQuantity: rule.maxQuantity ?? 0,
          equalQuantity: rule.equalQuantity ?? 0,
          amount: rule.amount ?? 0
        }))
      )
      : [];
  }

  /**
   * Loads insurers.
   */
  private loadInsurers(): void {
    this.insurerService.getAllSimpleInsurers().subscribe({
      next: (data: InsurerResponseDTO[]) => {
        this.insurersOptions = [
          ...data.map(i => ({ label: i.name, value: i.id }))
        ];
      },
      error: () => {
        this.showAlert('error', 'Error al cargar aseguradoras para liquidar.');
      }
    });
  }

  /**
   * Shows a temporary alert.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;


  /**
   *  ngOnInit
   */
  ngOnInit(): void {
    this.breadcrumbService.buildFromRoute(this.route);
    this.loadInsurers();
    this.loadNbuOptions();
  }

  /**
   * Table and summary.
   */
  providedServices: ProvidedServiceTableItemDTO[] = [];
  resumen: SettlementResumeDTO | null = null;

  columns: GenericColumn[] = [
    { field: 'plan', header: 'Plan' },
    { field: 'versionNbu', header: 'Versión NBU' },
    {
      field: 'validFrom', header: 'Vigente desde', pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    },
    {
      field: 'validTo', header: 'Vigente hasta', pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    },
    { field: 'protocols', header: 'Protocolos' },
    {
      field: 'fee', header: 'Arancel', pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.2-2'] }
        ]
    },
    {
      field: 'subtotal', header: 'Subtotal', pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.2-2'] }
        ]
    }
  ];

  /**
   * Returns actions for the 3-dots menu in each row (GenericMenuComponent expects MenuItem[])
   * @param row The row data.
   */
  getActions = (row: ProvidedServiceTableItemDTO): MenuItem[] => [
    {
      id: 'ver-prestaciones',
      label: 'Ver prestaciones',
      icon: 'pi pi-eye',
      command: () => this.onViewProvidedService(row),
      disabled: !row?.baseKey
    }
  ];

  /**
   * Opens the detail view for provided services.
   */
  private onViewProvidedService(row: ProvidedServiceTableItemDTO): void {
    const baseKey = row?.baseKey;
    const pages = row?.pageCount ?? 0;
    if (!baseKey) {
      this.showAlert('warning', 'No hay información de prestaciones para esta cobertura.');
      return;
    }
    // Initialize excluded set for this key if not exists
    if (!this.excludedServicesByKey[baseKey]) {
      this.excludedServicesByKey[baseKey] = new Set();
    }
    // Get the current row index
    const agreementIndex = this.providedServices.indexOf(row);
    this.viewingProvidedServicesFor = { baseKey, pageCount: pages, agreementIndex };
  }

  /** Manejo del cierre del modal de generación */
  onGeneratingClosed(): void {
    if (this.isGenerating) {
      // Evitar cerrar mientras está generando
      this.showGeneratingModal = true;
      return;
    }
    this.showGeneratingModal = false;
  }

  /**
   * Cierra el modal de generación respetando un tiempo mínimo visible.
   */
  private closeGeneratingModalAfterMin(startedAt: number, afterClose: () => void): void {
    const elapsed = Date.now() - startedAt;
    const remaining = this.GENERATION_MIN_MS - elapsed;
    if (remaining > 0) {
      setTimeout(() => afterClose(), remaining);
    } else {
      afterClose();
    }
  }

  /**
   * Handles the confirmation action for settlement creation.
   * Validates input, shows modal, and triggers settlement creation.
   */
  onConfirm(): void {

    const { insurerId, fechaDesde, fechaHasta } = this.filtros;

    // First validation
    if (!insurerId || !fechaDesde || !fechaHasta) {
      this.showAlert('warning', 'Debe seleccionar una aseguradora y un rango de fechas.');
      return;
    }

    // Mostrar modal de generación y bloquear UI
    this.isGenerating = true;
    this.showGeneratingModal = true;
    const startedAt = Date.now();

    this.fetchInsurerAndActivePlanIds(insurerId).subscribe({
      next: ({ planIds }) => {
        if (planIds.length === 0) {
          this.closeGeneratingModalAfterMin(startedAt, () => {
            this.isGenerating = false;
            this.showGeneratingModal = false;
            this.showAlert('warning', 'La aseguradora seleccionada no tiene planes activos.');
          });
          return;
        }

        const request = this.buildCreateRequest(insurerId, fechaDesde, fechaHasta);

        this.settlementService.createSettlement(request).subscribe({
          next: () => {
            // Cerrar modal y redirigir con estado de éxito (alerta en settlements-home)
            this.closeGeneratingModalAfterMin(startedAt, () => {
              this.isGenerating = false;
              this.showGeneratingModal = false;
              ;this.router.navigate(['../home'], {
                relativeTo: this.route,
                state: { settlementCreated: true }
              });
            });
          },
          error: () => {
            this.closeGeneratingModalAfterMin(startedAt, () => {
              this.isGenerating = false;
              this.showGeneratingModal = false;
              this.showAlert('error', 'Error al generar la liquidación.');
            });
          }
        });
      },
      error: () => {
        this.closeGeneratingModalAfterMin(startedAt, () => {
          this.isGenerating = false;
          this.showGeneratingModal = false;
          this.showAlert('error', 'Error al obtener los planes de la aseguradora.');
        });
      }
    });
  }


  /**
   * Handles the action to add a new special rule.
   * Loads plans from backend and shows the modal.
   */
  onNewRule() {
    if (!this.filtros.insurerId) {
      this.showAlert('warning', 'Debe seleccionar una aseguradora antes de crear reglas.');
      return;
    }

    // siempre refrescar los planes desde el back al abrir el modal
    this.insurerService.getCompleteById(this.filtros.insurerId).subscribe({
      next: (insurer) => {
        this.availablePlans = insurer.plans?.map(p => ({ id: p.id, name: p.name })) ?? [];
        this.showNewRuleModal = true;
      },
      error: () => this.showAlert('error', 'Error al cargar los planes.')
    });
  }

  showNewRuleModal = false;

  /**
   * Handles the change in settlement type (común/especial).
   * Resets rules and plans if type changes.
   * @param event The change event.
   */
  onTypeSettlementChange(event: SelectChangeEvent): void {
    this.filtros.tipoLiquidacion = event?.value ?? null;
    this.loadedRules = false;
    this.specialRulesPayload = [];

    if (this.filtros.tipoLiquidacion !== 'especial') {
      this.showNewRuleModal = false;
      this.availablePlans = [];
    }
  }

  /**
   * on insurer change
   */
  onInsurerChange(): void {
    this.loadedRules = false;
    this.specialRulesPayload = [];
    this.availablePlans = [];
    this.filtros.insurerId = this.filtros.insurerId ?? null;
  }

  /**
   * Handles the action to search for provided services.
   * Validates input and triggers preview settlement.
   */
  onSearchProvidedService(): void {
    this.searchStatus = 'buscando';
    this.loading = true;
    const { insurerId, fechaDesde, fechaHasta } = this.filtros;

    if (!insurerId || !fechaDesde || !fechaHasta) {
      this.loading = false;
      this.searchStatus = 'inicial';
      this.showAlert('warning', 'Debes seleccionar aseguradora y rango de fechas.');
      return;
    }

    this.fetchInsurerAndActivePlanIds(insurerId).subscribe({
      next: ({ planIds }) => {
        if (planIds.length === 0) {
          this.loading = false;
          this.searchStatus = 'inicial';
          this.showAlert('warning', 'La aseguradora seleccionada no tiene planes activos.');
          return;
        }
        const previewRequest = this.buildPreviewRequest(insurerId, fechaDesde, fechaHasta);
        this.settlementService.previewSettlement(previewRequest).subscribe({
          next: (response: SettlementCompleteResponseDTO) => {
            this.loading = false;
            this.providedServices = this.mapToProvidedServiceItems(response);
            this.resumen = this.mapToSettlementResume(response);
            this.fullSettlement = response;
            if (!response.totalProvidedServices || response.totalProvidedServices === 0) {
              this.searchStatus = 'noEncontrado';
              this.showAlert('warning', 'No se encontraron prestaciones para liquidar.');
            } else {
              this.searchStatus = 'completado';
            }
          },
          error: () => {
            this.loading = false;
            this.searchStatus = 'inicial';
            this.showAlert('error', 'Error al cargar las prestaciones para liquidar.');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.searchStatus = 'inicial';
        this.showAlert('error', 'No se pudo obtener la información de la aseguradora.');
      }
    });
  }

  /**
   * Handles the close event for the provided services detail view.
   * Resets the viewing state.
   */
  onProvidedServicesClosed(): void {
    this.viewingProvidedServicesFor = null;
  }

  /**
   * Handles the exclusion of provided services and updates the settlement totals.
   * Updates the excluded set, row data, and recalculates totals.
   * @param event ProvidedServicesExclusionEvent
   */
  onProvidedServicesExcluded(event: ProvidedServicesExclusionEvent): void {
    if (!this.viewingProvidedServicesFor) return;

    const baseKey = this.viewingProvidedServicesFor.baseKey;
    const agreementIndex = this.viewingProvidedServicesFor.agreementIndex;

    // Update the excluded set for this key
    this.excludedServicesByKey[baseKey] = new Set(event.excludedIds);
    this.excludedProvidedServicesIds = event.excludedIds;

    // Update the providedServices row with new counts and subtotal
    if (this.providedServices[agreementIndex]) {
      const row = this.providedServices[agreementIndex];
      row.protocols = event.totalServices;
      row.subtotal = event.subtotal;
    }

    // Recalculate settlement totals
    this.recalculateSettlementTotals();
  }

  /**
   * Maps a complete settlement response to table rows for provided services.
   * @param response SettlementCompleteResponseDTO
   * @returns ProvidedServiceTableItemDTO[]
   */
  private mapToProvidedServiceItems(
    response: SettlementCompleteResponseDTO
  ): ProvidedServiceTableItemDTO[] {
    const rows: ProvidedServiceTableItemDTO[] = [];

    response.plansProvidedServices.forEach(planEntry => {
      planEntry.settlementAgreements.forEach(agreementEntry => {
        const c = agreementEntry.agreement;

        const agreement = {
          id: c.id,
          insurerPlanId: c.insurerPlanId,
          insurerPlanName: c.insurerPlanName,
          versionNbu: c.versionNbu,
          coveragePercentage: c.coveragePercentage,
          ubValue: c.ubValue,
          validFromDate: c.validFromDate,
          validToDate: c.validToDate,
          requiresCopayment: c.requiresCopayment
        };

        let versionLabel = '-';
        if (agreement.versionNbu === 1) versionLabel = '2012_2016';
        else if (agreement.versionNbu === 2) versionLabel = '2016_2024';

        rows.push({
          plan: planEntry.plan?.name ?? '-',
          versionNbu: versionLabel,
          validFrom: agreement.validFromDate ?? '-',
          validTo: agreement.validToDate ?? '-',
          protocols: agreementEntry.providedServicesCount ?? 0,
          fee: agreement.ubValue ?? 0,
          subtotal: agreementEntry.subtotal ?? 0,
          baseKey: agreementEntry.key,
          pageCount: agreementEntry.pages
        });
      });
    });

    return rows;
  }

  /**
   * Maps a complete settlement response to a summarized resume DTO.
   * @param response SettlementCompleteResponseDTO
   * @returns SettlementResumeDTO
   */
  private mapToSettlementResume(
    response: SettlementCompleteResponseDTO
  ): SettlementResumeDTO {
    return {
      settlementNumber: response.id ?? 0,
      providedServicesCount: response.totalProvidedServices ?? 0,
      total: response.total,
      status: response.status
    };
  }


  /**
   * Refreshes the version labels for provided services using the nbuVersions array.
   */
  private refreshVersionLabels(): void {
    if (!this.providedServices?.length || !this.nbuVersions?.length) return;

    this.providedServices = this.providedServices.map(r => ({
      ...r,
      // r.version_nbu puede ser número o string; nbuLabel maneja ambos
      versionNbu: this.nbuLabel(r.versionNbu)
    }));
  }

  /**
   * Returns the display label for a given NBU version value.
   * @param value NBU version value
   * @returns string
   */
  private nbuLabel(value: any): string {
    if (value == null) return '';
    const s = String(value);

    // 1) buscar por id/value
    const byId = this.nbuVersions.find(o => String((o as any).value ?? (o as any).id ?? '') === s) as any;
    if (byId) return byId.label ?? byId.name ?? s;

    // 2) si ya vino como label, lo respetamos
    const byLabel = this.nbuVersions.find(o => (o as any).label === s || (o as any).name === s) as any;
    return byLabel?.label ?? byLabel?.name ?? s;
  }

  /**
   * Loads NBU options from the backend and refreshes version labels.
   */
  private loadNbuOptions(): void {
    this.nbuService.getOptions().subscribe({
      next: (opts) => {
        this.nbuVersions = opts as any[];
        this.refreshVersionLabels();  // + si ya hay filas, re-mapea labels
      },
      error: () => { /* opcional: alerta suave */
      }
    });
  }

  /**
   * Handles the confirmation of special rules from the modal.
   * Updates the local state and shows a success alert.
   * @param payload PlanRulesPayload[]
   */
  confirmedRules(payload: PlanRulesPayload[]): void {
    this.loadedRules = true;
    this.specialRulesPayload = payload;
    this.showAlert('success', `Se cargaron ${payload.length} grupos de reglas especiales.`);
  }


  /**
   * Handles the close event for the special rules modal.
   * Hides the modal.
   */
  closeRulesModal(): void {
    this.showNewRuleModal = false;
    this.loadedRules = this.specialRulesPayload.length > 0;
  }


  /** Badge status mapping */
  badgeStatusFrom(raw?: string): 'pendiente' | 'inactivo' | 'completo' | 'verificado' | 'activo' | 'minimo' {
    const v = (raw || '').toLowerCase();
    if (v.includes('pend')) return 'pendiente';
    if (v.includes('inform')) return 'completo';
    if (v.includes('fact')) return 'verificado';
    if (v.includes('anul') || v.includes('cancel')) return 'inactivo';
    return 'pendiente';
  }


  /**
   * Fetches the complete insurer and list of active plan IDs.
   * @param insurerId Insurer ID
   * @returns Observable with insurer and planIds
   */
  private fetchInsurerAndActivePlanIds(insurerId: number) {
    return this.insurerService.getCompleteById(insurerId).pipe(
      map((insurer: InsurerCompleteResponseDTO) => {
        const planIds = insurer.plans?.filter(p => p.isActive !== false).map(p => p.id) || [];
        return { insurer, planIds };
      })
    );
  }

  /**
   * Builds the preview request for settlement preview.
   * @param insurerId Insurer ID
   * @param fechaDesde Start date
   * @param fechaHasta End date
   * @returns SettlementPreviewRequestDTO
   */
  private buildPreviewRequest(
    insurerId: number,
    fechaDesde: Date,
    fechaHasta: Date
  ): SettlementPreviewRequestDTO {
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    const selectedType = this.getSettlementType();
    const specialRules = selectedType === 'ESPECIAL' ? this.buildSpecialRulesPayload() : undefined;
    return {
      insurerId,
      periodStart: formatDate(fechaDesde),
      periodEnd: formatDate(fechaHasta),
      type: selectedType,
      specialRules
    };
  }

  /**
   * Builds the create request for settlement creation.
   * @param insurerId Insurer ID
   * @param fechaDesde Start date
   * @param fechaHasta End date
   * @returns SettlementCreateRequestDTO
   */
  private buildCreateRequest(
    insurerId: number,
    fechaDesde: Date,
    fechaHasta: Date
  ): SettlementCreateRequestDTO {
    const selectedType = this.getSettlementType();
    const specialRules: SettlementSpecialRulesDTO[] = selectedType === 'ESPECIAL' ? this.buildSpecialRulesPayload() : [];
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return {
      settlementType: selectedType,
      insurerId,
      periodStart: formatDate(fechaDesde),
      periodEnd: formatDate(fechaHasta),
      excludedProvidedServicesIds: this.excludedProvidedServicesIds,
      specialRules,
      settlementKey: this.fullSettlement?.settlementKey
    };
  }

  /**
   * Returns to the main settlements-home
   */
  toReturn(): void {
    this.router.navigate(['/billing-collections/settlements/home']);
  }

  /**
   * Recalculates the settlement totals after services are excluded or included.
   * Updates the resumen object with new totals.
   */
  private recalculateSettlementTotals(): void {
    if (!this.resumen || !this.fullSettlement) return;

    // Sum up all subtotals and service counts
    const totalServices = this.providedServices.reduce((sum, ps) => sum + (ps.protocols ?? 0), 0);
    const totalSubtotal = this.providedServices.reduce((sum, ps) => sum + (ps.subtotal ?? 0), 0);

    this.resumen.providedServicesCount = totalServices;
    this.resumen.total = totalSubtotal;
  }

  // Table and pagination handling

  /** Restore state from localStorage */
  private restoreState(): void {
    const saved = localStorage.getItem('settlementNewState');
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      this.selectedIds = new Set(state.selectedIds);
      this.excludedCount = state.excludedCount;
      this.currentPage = state.currentPage;

      // Re-fetch provided services if there's a saved state
      this.fetchAndCachePage(this.currentPage, true);
    } catch { }
  }

  /** Load first pages (0,1,2) in parallel for smooth UX */
  private loadInitialPages(): void {
    for (let i = 0; i < 3; i++) {
      this.fetchAndCachePage(i);
    }
  }

  /** Handle paginator change from generic-table */
  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.currentPage = pageIndex;

    // Fetch the new page
    this.fetchAndCachePage(pageIndex);
  }

  /** Fetch a server page, map and cache it */
  private fetchAndCachePage(page: number, setAsData: boolean = false): void {
    const { insurerId, fechaDesde, fechaHasta } = this.filtros;

    if (!insurerId || !fechaDesde || !fechaHasta) return;

    this.fetchInsurerAndActivePlanIds(insurerId).subscribe({
      next: ({ planIds }) => {
        if (planIds.length === 0) return;

        const previewRequest = this.buildPreviewRequest(insurerId, fechaDesde, fechaHasta);
        this.settlementService.previewSettlement(previewRequest).subscribe({
          next: (response: SettlementCompleteResponseDTO) => {
            const rows = this.mapToProvidedServiceItems(response);

            if (setAsData) {
              // Set as current data if requested
              this.providedServices = rows;
            }

            // Refresh version labels after mapping
            this.refreshVersionLabels();
          },
          error: () => { }
        });
      },
      error: () => { }
    });
  }
}
