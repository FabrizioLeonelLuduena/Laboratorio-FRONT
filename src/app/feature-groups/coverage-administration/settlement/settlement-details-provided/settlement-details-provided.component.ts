import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit } from '@angular/core';

import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericHeaderCardComponent } from '../../../../shared/components/generic-header-card/generic-header-card.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import {
  ProvidedServiceCompleteResponseDTO,
  ProvidedServiceRow
} from '../../models/provided-service.model';
import { ProvidedServicesExclusionEvent } from '../../models/settlement.model';
import { DateArrayPipe } from '../../pipes/date-array.pipe';
import { ProvidedServicesService } from '../../services/provided-services.service';

/**
 * Component to display and manage provided services for a specific settlement agreement.
 * Allows excluding/including services and updating totals dynamically.
 * All state is managed in the parent component, no localStorage.
 */
@Component({
  selector: 'app-settlement-details-provided',
  standalone: true,
  templateUrl: './settlement-details-provided.component.html',
  styleUrls: ['./settlement-details-provided.component.css'],
  imports: [
    CommonModule,
    GenericTableComponent,
    GenericHeaderCardComponent,
    CurrencyPipe,
    GenericBadgeComponent,
    GenericButtonComponent
  ]
})
export class SettlementDetailsProvidedComponent implements OnInit {
  /**
   * a
   */
  constructor(
    private providedSvc: ProvidedServicesService
  ) {}

  /** Key to fetch provided services from Redis */
  @Input() baseKey: string = '';
  /** Number of pages available */
  @Input() pageCount: number = 0;
  /** IDs of already excluded services (from parent) */
  @Input() excludedIds: Set<number> = new Set();
  /** Emitted when user wants to go back */
  @Output() backPressed = new EventEmitter<void>();
  /** Emitted when services are excluded (with updated counts) */
  @Output() servicesExcluded = new EventEmitter<ProvidedServicesExclusionEvent>();

  // Table state
  columns = [
    { field: 'select', header: '', sortable: false },
    { field: 'reinclude', header: '', sortable: false },
    { field: 'serviceDate', header: 'Fecha de servicio', sortable: true },
    { field: 'procedencia', header: 'Procedencia', sortable: true },
    { field: 'analisis', header: 'Cant. análisis', sortable: true },
    { field: 'copayment', header: 'Copago', sortable: true },
    { field: 'amountCovered', header: 'Total', sortable: true },
    { field: 'status', header: 'Estado', sortable: true }
  ];

  data: ProvidedServiceRow[] = [];
  totalRecords = 0;
  loading = false;
  rows = 10;

  /** Selected for exclusion (temporary UI state) */
  selectedIds = new Set<number>();
  /** Currently excluded count */
  excludedCount = 0;

  /** Local cache of pages */
  private pageCache = new Map<number, ProvidedServiceRow[]>();
  private currentPage = 0;

  /** Column templates */
  columnTemplates = new Map<string, TemplateRef<any>>();
  @ViewChild('selectTpl', { read: TemplateRef }) selectTpl?: TemplateRef<any>;
  @ViewChild('reincludeTpl', { read: TemplateRef }) reincludeTpl?: TemplateRef<any>;
  @ViewChild('amountCoveredTpl', { read: TemplateRef }) amountCoveredTpl?: TemplateRef<any>;
  @ViewChild('statusTpl', { read: TemplateRef }) statusTpl?: TemplateRef<any>;

  // Table filters
  tableFilters: any[] = [
    {
      id: 'status',
      type: 'select',
      label: 'Estado',
      options: [
        { label: 'Todos', value: null },
        { label: this.statusToSpanish('CREATED'), value: 'pendiente' },
        { label: this.statusToSpanish('READY_TO_SAMPLES_COLLECTION'), value: 'pendiente' },
        { label: this.statusToSpanish('SAMPLES_COLLECTED'), value: 'pendiente' },
        { label: this.statusToSpanish('PRE_ANALYTICAL'), value: 'pendiente' },
        { label: this.statusToSpanish('ANALYTICAL'), value: 'completo' },
        { label: this.statusToSpanish('POST_ANALYTICAL'), value: 'completo' },
        { label: this.statusToSpanish('DELIVERED'), value: 'completo' },
        { label: this.statusToSpanish('CANCELED'), value: 'inactivo' },
        { label: this.statusToSpanish('CANCEL'), value: 'inactivo' }
      ]
    }
  ];

  searchText: string = '';
  filteredData: ProvidedServiceRow[] = [];
  activeFilters: any = {};

  // Sorting state
  sortField: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';

  /**
   * a
   */
  ngOnInit(): void {
    this.loadInitialPages();
    // Register templates
    setTimeout(() => {
      if (this.selectTpl) this.columnTemplates.set('select', this.selectTpl);
      if (this.reincludeTpl) this.columnTemplates.set('reinclude', this.reincludeTpl);
      if (this.amountCoveredTpl) this.columnTemplates.set('amountCovered', this.amountCoveredTpl);
      if (this.statusTpl) this.columnTemplates.set('status', this.statusTpl);
    });
  }

  /**
   * Loads the first pages for smooth UX
   */
  private loadInitialPages(): void {
    this.totalRecords = this.pageCount * this.rows;
    this.excludedCount = this.excludedIds.size;
    this.fetchAndCachePage(0, true);
    if (this.pageCount > 1) this.fetchAndCachePage(1);
  }

  /** Handles filter and search changes */
  onTableFilterChange(event: any) {
    let filtersObj: any = {};
    let searchText = '';
    if (event.filters && Array.isArray(event.filters)) {
      // Es FilterChangeEvent
      for (const f of event.filters) {
        filtersObj[f.id] = f.value;
      }
    } else if (event.filters) {
      filtersObj = event.filters;
    }
    if ('search' in event) {
      searchText = event.search || '';
    } else if ('searchText' in event) {
      searchText = event.searchText || '';
    } else if (typeof event === 'string') {
      searchText = event;
    }
    this.activeFilters = filtersObj;
    this.searchText = searchText;
    this.applyFilters();
  }

  /** Allows searching from the table's search input */
  onTableSearch(search: string) {
    this.searchText = search;
    this.applyFilters();
  }

  /** Applies filters and search to cached data */
  applyFilters() {
    let allRows: ProvidedServiceRow[] = [];
    this.pageCache.forEach(page => allRows.push(...page));
    let filtered = allRows;
    // Filtro por estado
    if (this.activeFilters.status) {
      filtered = filtered.filter(r => this.badgeStatus(r) === this.activeFilters.status);
    }
    // Buscador (paciente, doc, nro autorización)
    if (this.searchText) {
      const txt = this.searchText.toLowerCase();
      filtered = filtered.filter(r =>
        (r.patient && r.patient.toLowerCase().includes(txt)) ||
        (r.dni && r.dni.toString().includes(txt)) ||
        (r.authorizationNumber && r.authorizationNumber.toLowerCase().includes(txt))
      );
    }
    this.filteredData = filtered;
    this.data = filtered.slice(0, this.rows);
    this.totalRecords = filtered.length;
  }

  /** Overrides pagination to use filtered data */
  onPageChange(event: { first: number; rows: number }): void {
    const page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    if (event.rows && event.rows !== this.rows) {
      this.rows = event.rows;
    }
    if (this.filteredData.length) {
      this.data = this.filteredData.slice(page * this.rows, (page + 1) * this.rows);
    } else {
      if (this.pageCache.has(page)) {
        this.data = this.pageCache.get(page)!;
      } else {
        this.fetchAndCachePage(page, true);
      }
    }
    this.currentPage = page;
    const nextToPrefetch = page + 2;
    if (nextToPrefetch < this.pageCount && !this.pageCache.has(nextToPrefetch)) {
      this.fetchAndCachePage(nextToPrefetch);
    }
  }

  /** Fetches a server page, maps and caches it */
  private fetchAndCachePage(page: number, setAsData: boolean = false): void {
    if (!this.baseKey) return;
    this.loading = setAsData;
    this.providedSvc.getSettlementPage(this.baseKey, page).subscribe({
      next: (list: ProvidedServiceCompleteResponseDTO[]) => {
        const rows = list.map(dto => this.mapToRow(dto));
        // Apply excluded state
        const hydrated = rows.map(r =>
          this.excludedIds.has(r.id) ? { ...r, excluded: true, selected: false } : r
        );
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

  /** Maps backend DTO to table row */
  private mapToRow(dto: ProvidedServiceCompleteResponseDTO): ProvidedServiceRow {
    const totalCovered = (dto.analysisAmounts ?? [])
      .map(a => a.coveredAmount ?? 0)
      .reduce((acc, n) => acc + (Number(n) || 0), 0);

    const patientName = dto.patient
      ? `${dto.patient.firstName ?? ''} ${dto.patient.lastName ?? ''}`.trim()
      : '-';

    const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    return {
      id: dto.id,
      serviceDate: new DateArrayPipe().transform(dto.serviceDate) || '-',
      procedencia: dto.configuration?.description ?? '-',
      authorizationNumber: dto.authorizationNumber ?? '-',
      patient: patientName || '-',
      dni: dto.patient?.dni ?? '-',
      analisis: (dto.analysisAmounts ?? []).length,
      amountCovered: currency.format(totalCovered),
      amountCoveredNum: totalCovered,
      copayment: currency.format(Number(dto.copaymentAmount ?? 0)),
      copaymentNum: Number(dto.copaymentAmount ?? 0),
      status: dto.protocol.status,
      analysisAmounts: dto.analysisAmounts ?? [],
      selected: this.selectedIds.has(dto.id),
      excluded: this.excludedIds.has(dto.id)
    } as any;
  }

  /** Toggle selection of a row */
  toggleSelect(row: ProvidedServiceRow): void {
    if (this.selectedIds.has(row.id)) {
      this.selectedIds.delete(row.id);
    } else {
      this.selectedIds.add(row.id);
    }
    this.data = this.data.map(r =>
      r.id === row.id ? { ...r, selected: this.selectedIds.has(row.id) } as any : r
    );
  }

  // Selects or deselects all visible rows
  /**
   * Selects or deselects all visible rows
   */
  toggleSelectAllVisible(): void {
    if (this.allVisibleSelected()) {
      // Deseleccionar todos los visibles
      this.data.forEach(row => {
        if (!row.excluded) this.selectedIds.delete(row.id);
      });
    } else {
      // Seleccionar todos los visibles no excluidos
      this.data.forEach(row => {
        if (!row.excluded) this.selectedIds.add(row.id);
      });
    }
    this.data = this.data.map(r => ({ ...r, selected: this.selectedIds.has(r.id) }) as any);
  }

  // Returns true if all visible non-excluded rows are selected
  /**
   * Returns true if all visible non-excluded rows are selected
   */
  allVisibleSelected(): boolean {
    return this.data.filter(r => !r.excluded).every(r => this.selectedIds.has(r.id)) && this.data.filter(r => !r.excluded).length > 0;
  }

  /** Exclude selected rows */
  excludeSelected(): void {
    if (!this.selectedIds.size) return;

    const ids = Array.from(this.selectedIds);
    ids.forEach(id => this.excludedIds.add(id));

    // Update data and cache
    const updated = this.data.map(r =>
      this.excludedIds.has(r.id) ? { ...r, excluded: true, selected: false } as any : r
    );
    this.data = updated;
    this.pageCache.set(this.currentPage, updated);
    this.excludedCount = this.excludedIds.size;

    const totalServices = this.data.filter(r => !r.excluded).length;
    const subtotal = (this.data as any[])
      .filter(r => !r.excluded)
      .reduce((sum, r) => sum + (r.amountCoveredNum || 0) - (r.copaymentNum || 0), 0);

    this.servicesExcluded.emit({
      excludedIds: Array.from(this.excludedIds),
      excludedCount: this.excludedCount,
      totalServices,
      subtotal
    });

    this.selectedIds.clear();
  }

  /** Clear temporary selection */
  clearSelection(): void {
    if (!this.selectedIds.size) return;
    this.selectedIds.clear();
    this.data = this.data.map(r => ({ ...r, selected: false }) as any);
  }

  /** Navigate back */
  goBack(): void {
    this.backPressed.emit();
  }

  /** Re-include an excluded service */
  reinclude(row: ProvidedServiceRow): void {
    if (!row.excluded) return;
    this.excludedIds.delete(row.id);

    const updated = this.data.map(r =>
      r.id === row.id ? { ...r, excluded: false } as any : r
    );
    this.data = updated;
    this.pageCache.set(this.currentPage, updated);
    this.excludedCount = this.excludedIds.size;

    const totalServices = this.data.filter(r => !r.excluded).length;
    const subtotal = (this.data as any[])
      .filter(r => !r.excluded)
      .reduce((sum, r) => sum + (r.amountCoveredNum || 0) - (r.copaymentNum || 0), 0);

    this.servicesExcluded.emit({
      excludedIds: Array.from(this.excludedIds),
      excludedCount: this.excludedCount,
      totalServices,
      subtotal
    });
  }

  /** Handles table sort change */
  onSortChange(event: { field: string; order: 'asc' | 'desc' }[] | { field: string; order: 'asc' | 'desc' }) {
    // Soporta ambos: array (de la tabla genérica) o objeto simple
    const sort = Array.isArray(event) ? event[0] : event;
    if (!sort) return;
    this.sortField = sort.field;
    this.sortOrder = sort.order;
    this.applySort();
  }

  /** Applies sorting to the current data */
  private applySort() {
    if (!this.sortField) return;
    const direction = this.sortOrder === 'asc' ? 1 : -1;
    this.data = [...this.data].sort((a: any, b: any) => {
      const aValue = a[this.sortField];
      const bValue = b[this.sortField];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return -1 * direction;
      if (bValue == null) return 1 * direction;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return aValue.toString().localeCompare(bValue.toString(), 'es', { numeric: true }) * direction;
    });
  }

  /**
   * Returns the badge status for a row, mapped to color logic:
   * - CREATED, READY_TO_SAMPLES_COLLECTION, SAMPLES_COLLECTED, PRE_ANALYTICAL: 'pendiente' (orange)
   * - ANALYTICAL, POST_ANALYTICAL, DELIVERED: 'completo' (green/blue)
   * - CANCELED, CANCEL: 'inactivo' (red)
   */
  badgeStatus(row: ProvidedServiceRow): 'pendiente' | 'completo' | 'inactivo' {
    if (row.excluded) return 'inactivo';
    const status = (row.status || '').toUpperCase();
    if ([
      'CREATED',
      'READY_TO_SAMPLES_COLLECTION',
      'SAMPLES_COLLECTED',
      'PRE_ANALYTICAL'
    ].includes(status)) {
      return 'pendiente';
    }
    if ([
      'ANALYTICAL',
      'POST_ANALYTICAL',
      'DELIVERED'
    ].includes(status)) {
      return 'completo';
    }
    if ([
      'CANCELED',
      'CANCEL'
    ].includes(status)) {
      return 'inactivo';
    }
    return 'pendiente';
  }

  /**
   * Returns the Spanish label for a given status
   */
  statusToSpanish(status: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      CREATED: 'CREADO',
      READY_TO_SAMPLES_COLLECTION: 'LISTO PARA TOMA DE MUESTRAS',
      SAMPLES_COLLECTED: 'MUESTRAS RECOLECTADAS',
      PRE_ANALYTICAL: 'PRE-ANALÍTICO',
      ANALYTICAL: 'ANALÍTICO',
      POST_ANALYTICAL: 'POST-ANALÍTICO',
      DELIVERED: 'ENTREGADO',
      CANCELED: 'CANCELADO',
      CANCEL: 'CANCELADO'
    };
    const key = (status || '').toUpperCase().trim();
    return map[key] || key;
  }
}
