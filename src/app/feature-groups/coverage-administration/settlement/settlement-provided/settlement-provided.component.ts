import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericHeaderCardComponent } from '../../../../shared/components/generic-header-card/generic-header-card.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ProvidedServiceCompleteResponseDTO, ProvidedServiceRow } from '../../models/provided-service.model';
import { DateArrayPipe } from '../../pipes/date-array.pipe';
import { ProvidedServicesService } from '../../services/provided-services.service';

/**
 * Lists paginated provided services for a settlement agreement.
 */
@Component({
  selector: 'app-settlement-provided',
  standalone: true,
  templateUrl: './settlement-provided.component.html',
  styleUrls: ['./settlement-provided.component.css'],
  imports: [GenericTableComponent, GenericHeaderCardComponent, CurrencyPipe, GenericBadgeComponent, GenericButtonComponent]
})
export class SettlementProvidedComponent implements OnInit {
  /**
   * Constructor.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private providedSvc: ProvidedServicesService
  ) {}

  // Query params
  baseKey = '';
  pagesCount = 0;
  pageSize = 10; // backend fixed page size


  /** breadcrumbService. */
  readonly breadcrumbService = inject(BreadcrumbService);

  // Table state
  columns = [
    { field: 'select', header: '' },
    { field: 'reinclude', header: '' },
    { field: 'serviceDate', header: 'Fecha de servicio' },
    { field: 'patient', header: 'Paciente' },
    { field: 'dni', header: 'Documento' },
    { field: 'authorizationNumber', header: 'N° autorización' },
    { field: 'analisis', header: 'Cant. análisis' },
    { field: 'amountCovered', header: 'Total' },
    { field: 'copayment', header: 'Copago' },
    { field: 'status', header: 'Estado' }
  ];
  data: ProvidedServiceRow[] = [];
  totalRecords = 0;
  loading = false;
  rows = 10;

  /** Selected services for exclusion */
  selectedIds = new Set<number>();
  excludedCount = 0;

  /** IDs already excluded from the main draft */
  private excludedIdsPersisted: Set<number> = new Set<number>();
  /** Exclusion map by baseKey to avoid dragging between settlements */
  private exclusionsByKey: Record<string, number[]> = {};

  /** Local cache of pages (pageIndex -> rows) */
  private pageCache = new Map<number, ProvidedServiceRow[]>();
  /** Currently displayed page index */
  private currentPage = 0;

  /** Restore state from localStorage */
  private restoreState(): void {
    const savedState = localStorage.getItem('settlementState');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.baseKey = state.baseKey;
      this.pagesCount = state.pagesCount;
      this.pageSize = state.pageSize;
      this.rows = state.pageSize;
      this.totalRecords = state.pagesCount * state.pageSize;
      this.data = state.data;
      this.pageCache = new Map(state.pageCache);
      this.currentPage = state.currentPage;
    }
  }

  /**
   * ngOnInit
   */
  ngOnInit(): void {
    // cargar ids excluidos persistidos
    this.breadcrumbService.buildFromRoute(this.route);
    try {
      const draftRaw = localStorage.getItem('settlementNewDraft');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        this.exclusionsByKey = draft.exclusionsByKey ?? {};
      }
    } catch {}
    this.restoreState();
    if (!this.baseKey) {
      this.route.queryParamMap.subscribe((params) => {
        this.baseKey = params.get('key') ?? '';
        this.pagesCount = Number(params.get('pages') ?? 0);
        this.pageSize = Number(params.get('pageSize') ?? 10) || 10;
        this.rows = this.pageSize;
        this.totalRecords = this.pagesCount * this.pageSize;
        // hidratar exclusiones por key
        const prevForKey = this.baseKey ? (this.exclusionsByKey[this.baseKey] ?? []) : [];
        this.excludedIdsPersisted = new Set(prevForKey);
        this.excludedCount = prevForKey.length;
        if (!this.baseKey) {
          this.router.navigate(['../new'], { relativeTo: this.route });
          return;
        }
        this.loadInitialPages();
      });
    } else {
      // si ya venía baseKey del estado restaurado
      const prevForKey = this.baseKey ? (this.exclusionsByKey[this.baseKey] ?? []) : [];
      this.excludedIdsPersisted = new Set(prevForKey);
      this.excludedCount = prevForKey.length;
    }
    // inicializar templates
    setTimeout(() => {
      if (this.selectTpl) this.columnTemplates.set('select', this.selectTpl);
      if (this.reincludeTpl) this.columnTemplates.set('reinclude', this.reincludeTpl);
      if (this.amountCoveredTpl) this.columnTemplates.set('amountCovered', this.amountCoveredTpl);
      if (this.statusTpl) this.columnTemplates.set('status', this.statusTpl);
    });
  }

  /** Load first pages (0,1,2) in parallel for smooth UX */
  private loadInitialPages(): void {
    this.fetchAndCachePage(0, true);
    this.fetchAndCachePage(1);
    this.fetchAndCachePage(2);
  }

  /** Handle paginator change from generic-table */
  onPageChange(event: { first: number; rows: number }): void {
    const page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    if (event.rows && event.rows !== this.rows) {
      // Keep rows in sync with table (backend is fixed to 10 though)
      this.rows = event.rows;
    }
    this.currentPage = page;

    // Use cache if available, otherwise fetch
    if (this.pageCache.has(page)) {
      this.data = this.pageCache.get(page)!;
    } else {
      this.fetchAndCachePage(page, true);
    }

    // Prefetch next page (page + 2 ahead window)
    const nextToPrefetch = page + 2;
    if (nextToPrefetch < this.pagesCount && !this.pageCache.has(nextToPrefetch)) {
      this.fetchAndCachePage(nextToPrefetch);
    }
  }

  /** Fetch a server page, map and cache it */
  private fetchAndCachePage(page: number, setAsData: boolean = false): void {
    if (!this.baseKey) return;
    this.loading = setAsData; // only show spinner when it's the active page
    this.providedSvc.getSettlementPage(this.baseKey, page).subscribe({
      next: (list: ProvidedServiceCompleteResponseDTO[]) => {
        const rows = list.map(dto => this.mapToRow(dto));
        // aplicar estado excluido a filas correspondientes
        const hydrated = rows.map(r => this.excludedIdsPersisted.has(r.id) ? { ...r, excluded: true, selected: false } : r);
        this.pageCache.set(page, hydrated);
        if (setAsData) this.data = hydrated;
        this.loading = false;
      },
      error: () => {
        if (setAsData) this.data = [];
        this.loading = false;
      }
    });
  }

  /** Map backend DTO to a table row keeping analysis list for expand */
  private mapToRow(dto: ProvidedServiceCompleteResponseDTO): ProvidedServiceRow {
    const totalCovered = (dto.analysisAmounts ?? [])
      .map(a => a.coveredAmount ?? 0)
      .reduce((acc, n) => acc + (Number(n) || 0), 0);

    const patientName = dto.patient ? `${dto.patient.firstName ?? ''} ${dto.patient.lastName ?? ''}`.trim() : '-';

    const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    return {
      id: dto.id,
      serviceDate: new DateArrayPipe().transform(dto.serviceDate) || '-',
      authorizationNumber: dto.authorizationNumber ?? '-',
      patient: patientName || '-',
      dni: dto.patient?.dni ?? '-',
      analisis: (dto.analysisAmounts ?? []).length,
      amountCovered: currency.format(totalCovered),
      copayment: currency.format(Number(dto.copaymentAmount ?? 0)),
      status: dto.protocol.status,
      analysisAmounts: dto.analysisAmounts ?? [],
      selected: this.selectedIds.has(dto.id),
      excluded: this.excludedIdsPersisted.has(dto.id)
    } as any;
  }

  /** Toggle selection of a row */
  toggleSelect(row: ProvidedServiceRow): void {
    if (this.selectedIds.has(row.id)) this.selectedIds.delete(row.id); else this.selectedIds.add(row.id);
    // actualizar data para reflejar
    this.data = this.data.map(r => r.id === row.id ? { ...r, selected: this.selectedIds.has(row.id) } as any : r);
  }

  /** Exclude selected rows visually and update count */
  excludeSelected(): void {
    if (!this.selectedIds.size) return;
    const ids = Array.from(this.selectedIds);
    ids.forEach(id => this.excludedIdsPersisted.add(id));
    // marcar excluidas visualmente en data
    const updated = this.data.map(r => this.excludedIdsPersisted.has(r.id) ? { ...r, excluded: true, selected: false } as any : r);
    this.data = updated;
    // actualizar cache de página actual para que no se pierda al volver
    this.pageCache.set(this.currentPage, updated);
    this.excludedCount = this.excludedIdsPersisted.size;
    // persistir inmediatamente
    this.persistExcluded();
    this.selectedIds.clear();
  }

  /** Clears the temporary selection of services (without touching permanently excluded) */
  clearSelection(): void {
    if (!this.selectedIds.size) return;
    this.selectedIds.clear();
    this.data = this.data.map(r => ({ ...r, selected: false }) as any);
  }

  /** Navigate back to new settlement */
  goBack(): void {
    // Agregar seleccionadas como excluidas antes de volver
    if (this.selectedIds.size) {
      this.selectedIds.forEach(id => this.excludedIdsPersisted.add(id));
    }
    this.persistExcluded();
    this.router.navigate(['../new'], { relativeTo: this.route });
  }

  /** Column templates map */
  columnTemplates = new Map<string, TemplateRef<any>>();
  @ViewChild('selectTpl', { read: TemplateRef }) selectTpl?: TemplateRef<any>;
  @ViewChild('reincludeTpl', { read: TemplateRef }) reincludeTpl?: TemplateRef<any>;
  @ViewChild('amountCoveredTpl', { read: TemplateRef }) amountCoveredTpl?: TemplateRef<any>;
  @ViewChild('statusTpl', { read: TemplateRef }) statusTpl?: TemplateRef<any>;

  /** Determines the status for the GenericBadge */
  badgeStatus(row: ProvidedServiceRow): 'pendiente' | 'inactivo' | 'completo' | 'verificado' | 'activo' | 'minimo' {
    if (row.excluded) return 'inactivo';
    const raw = (row.status || '').toLowerCase();
    if (raw.includes('pend')) return 'pendiente';
    if (raw.includes('min')) return 'minimo';
    if (raw.includes('comp')) return 'completo';
    if (raw.includes('verif')) return 'verificado';
    if (raw.includes('act')) return 'activo';
    return 'inactivo';
  }

  /** Persists the set of excluded IDs in the main draft (localStorage) */
  private persistExcluded(): void {
    try {
      const draftRaw = localStorage.getItem('settlementNewDraft');
      const draft = draftRaw ? JSON.parse(draftRaw) : {};
      // guardar por key
      if (this.baseKey) {
        const map = draft.exclusionsByKey ?? {};
        map[this.baseKey] = Array.from(this.excludedIdsPersisted);
        draft.exclusionsByKey = map;
        // también mantener plano como unión de todas las keys para compatibilidad
        const allIds = Object.values(map).flat();
        draft.excludedProvidedServicesIds = Array.from(new Set(allIds));
      } else {
        draft.excludedProvidedServicesIds = Array.from(this.excludedIdsPersisted);
      }
      localStorage.setItem('settlementNewDraft', JSON.stringify(draft));
    } catch {}
  }

  /** Re-include a previously excluded service */
  reinclude(row: ProvidedServiceRow): void {
    if (!row.excluded) return; // nada que hacer
    this.excludedIdsPersisted.delete(row.id);
    // actualizar data y cache
    const updated = this.data.map(r => r.id === row.id ? { ...r, excluded: false } as any : r);
    this.data = updated;
    this.pageCache.set(this.currentPage, updated);
    this.excludedCount = this.excludedIdsPersisted.size;
    this.persistExcluded();
  }
}
