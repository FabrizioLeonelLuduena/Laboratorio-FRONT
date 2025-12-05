import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';

import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { Filter, FilterChangeEvent } from '../../../../../shared/models/filter.model';
import { TranslateStatusPipe } from '../../../../../shared/pipes/translate-status.pipe';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import {
  ProtocolResponse
} from '../../../pre-analytical/models/protocol.interface';


/**
 * Details of the protocols obtained
 */
@Component({
  selector: 'app-protocol-detail',
  standalone: true,
  imports: [
    CommonModule,
    BadgeModule,
    CardModule,
    GenericTableComponent,
    TranslateStatusPipe,
    GenericBadgeComponent
  ],
  providers: [DatePipe],
  templateUrl: './protocol-detail.component.html',
  styleUrl: './protocol-detail.component.css'
})
export class ProtocolDetailComponent implements AfterViewInit, OnChanges {

  @ViewChild('statusTpl') statusTpl?: TemplateRef<any>;

  /** Map of column templates to pass to GenericTable */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  // bandera de carga para el spinner
  isLoading = false;

  /** Breadcrumb service */
  private readonly breadcrumbService = inject(BreadcrumbService);

  /** Activated route for breadcrumb building */
  private readonly route = inject(ActivatedRoute);

  /**
   * Router Constructor
   */
  constructor(
    private router: Router,
    private datePipe: DatePipe
  ) {}

  /** Currently selected protocol (for displaying details) */
  @Input() protocol: ProtocolResponse | null = null;

  /** List of protocols to display in the table */
  @Input() protocols: ProtocolResponse[] = [];

  /** Loading state for the table */
  @Input() tableLoading = false;

  /** Total number of records for pagination */
  @Input() totalRecords = 0;

  /** Current page index (zero-based) */
  @Input() page = 0;

  /** Page size (rows per page) */
  @Input() size = 10;

  /** Emits when a protocol is selected from the table */
  @Output() protocolSelected = new EventEmitter<ProtocolResponse | null>();

  /** Emits pagination changes */
  @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

  /** Emits sorting changes */
  @Output() sortChange = new EventEmitter<{ field: string; order: 'asc' | 'desc' }[]>();

  /** Emits global filter changes */
  @Output() globalFilterChange = new EventEmitter<string>();

  /** Emits date filter changes */
  @Output() dateFilterChange = new EventEmitter<{ start: string; end: string }>();

  /** Column definitions for the generic table component */
  columns: Array<{ field: string; header: string; sortable?: boolean }> = [];

  /**
   * Protocol rows prepared for the table display
   */
  protocolRows: Array<{
    id: number;
    patientName: string;
    createdAt: string | null;
    createdAtDate: string;
    createdAtTime: string;
    userCreator: string;
    status: string;
    statusText: string;
    originalProtocol: ProtocolResponse;
  }> = [];

  /** Filter definitions for the protocol table */
  filters: Filter[] = [
    {
      id: 'dateRange',
      label: 'Rango de Fechas',
      type: 'dateRange',
      dateFrom: new Date(),
      dateTo: new Date()
    }
  ];

  /**
   * Initialize columns after view initialization
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'id', header: 'N° Protocolo', sortable: true },
      { field: 'patientName', header: 'Paciente', sortable: true },
      { field: 'createdAtDate', header: 'Fecha de creación', sortable: true },
      { field: 'createdAtTime', header: 'Hora de creación', sortable: false },
      { field: 'userCreator', header: 'Generado por', sortable: true },
      { field: 'statusText', header: 'Estado', sortable: false }
    ];

    this.updateProtocolRows();
    // Register the status template
    if (this.statusTpl) {
      this.columnTemplates.set('statusText', this.statusTpl);
    }
  }

  /**
   * Updates the protocol rows when protocols input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['protocols']) {
      this.updateProtocolRows();
    }
  }

  /**
   * Builds protocol rows from the protocols array
   */
  private updateProtocolRows(): void {
    this.protocolRows = this.protocols.map(protocol => {
      const createdAt = protocol.createdAt ? new Date(protocol.createdAt) : null;
      const createdAtDate = createdAt
        ? this.datePipe.transform(createdAt, 'dd/MM/yyyy') || ''
        : '—';
      const createdAtTime = createdAt
        ? this.datePipe.transform(createdAt, 'HH:mm') || ''
        : '—';

      return {
        id: protocol.id,
        patientName: protocol.patientName,
        createdAt: protocol.createdAt,
        createdAtDate,
        createdAtTime,
        userCreator: protocol.userCreator,
        status: protocol.status,
        statusText: protocol.status,
        originalProtocol: protocol
      };
    });
  }

  /**
   * Navigate to protocol detail page
   */
  viewProtocolDetail(row: any): void {
    const protocol = row.originalProtocol as ProtocolResponse;
    this.router.navigate(['/analytical-management/status-followment/detail', protocol.id]);
  }

  /**
   * Returns actions available for each row
   */
  getActions = (row: any) => [
    {
      label: 'Ver Detalle',
      icon: 'pi pi-eye',
      command: () => this.viewProtocolDetail(row)
    }
  ];

  /**
   * Map a domain status code to one of the generic badge statuses
   */
  mapStatusToBadge(status?: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
    if (!status) return 'pendiente';

    const s = status.toString().trim().toUpperCase();

    const pendiente = ['PENDING', 'PENDING_COLLECTION', 'IN_PREPARATION', 'READY_TO_SAMPLE_COLLECTION'];
    const activo = ['IN_PROGRESS', 'PROCESSING', 'IN_TRANSIT', 'COLLECTED', 'ANALYZED', 'REPORTED', 'DERIVED'];
    const completo = ['DONE', 'COMPLETED'];
    const verificado = ['APPROVED', 'VALIDATED', 'DELIVERED'];
    const inactivo = ['REJECTED', 'CANCELLED', 'CANCELED', 'LOST'];

    if (pendiente.includes(s)) return 'pendiente';
    if (activo.includes(s)) return 'activo';
    if (completo.includes(s)) return 'completo';
    if (verificado.includes(s)) return 'verificado';
    if (inactivo.includes(s)) return 'inactivo';

    return 'pendiente';
  }

  /**
   * Handle pagination change from the table
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.pageChange.emit(event);
  }

  /**
   * Handle sorting changes from the table
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    this.sortChange.emit(sortArray);
  }

  /**
   * Handle global filter changes from the table
   */
  onGlobalFilterChange(term: string): void {
    this.globalFilterChange.emit(term);
  }

  /**
   * Handle filter changes from the table
   */
  onFilterChange(event: FilterChangeEvent): void {
    // Si no hay filtros activos (limpiaron todos los filtros)
    if (event.filters.length === 0) {
      // Cargar protocolos sin filtros de fecha
      this.dateFilterChange.emit({ start: '', end: '' });
      this.page = 0;
      return;
    }

    const dateFilter = event.filters.find(f => f.id === 'dateRange');
    if (dateFilter) {
      // Si las fechas fueron limpiadas (ambas son null o undefined)
      if (!dateFilter.dateFrom && !dateFilter.dateTo) {
        // Cargar protocolos sin filtros de fecha
        this.dateFilterChange.emit({ start: '', end: '' });
        this.page = 0;
        return;
      }

      // Si ambas fechas están definidas
      if (dateFilter.dateFrom && dateFilter.dateTo) {
        const fromDate = new Date(dateFilter.dateFrom);
        const toDate = new Date(dateFilter.dateTo);

        if (fromDate > toDate) {
          return;
        }

        const startISO = this.formatDateToStartOfDay(fromDate);
        const endISO = this.formatDateToEndOfDay(toDate);

        this.dateFilterChange.emit({ start: startISO, end: endISO });
        this.page = 0;
      }
    }
  }

  /**
   * Formats a date to ISO string at the start of the day (00:00:00)
   */
  private formatDateToStartOfDay(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  /**
   * Formats a date to ISO string at the end of the day (23:59:59)
   */
  private formatDateToEndOfDay(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59:59`;
  }

}
