import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ProtocolResponse } from '../../pre-analytical/models/protocol.interface';
import { ProtocolDetailComponent } from '../components/protocol-detail/protocol-detail.component';
import { ProtocolService } from '../services/protocol.service';

/**
 * Container component responsible for handling protocol searching,
 * filtering by date or ID, and displaying selected protocol details.
 */
@Component({
  selector: 'app-status-followment-home',
  templateUrl: './status-followment-home.component.html',
  standalone: true,
  imports: [
    ProtocolDetailComponent,
    SpinnerComponent
  ],
  styleUrls: ['./status-followment-home.component.css']
})
export class StatusFollowmentHomeComponent implements OnInit {

  /** List of protocols loaded from the backend */
  protocols: ProtocolResponse[] = [];

  /** Currently selected protocol (for displaying details) */
  selectedProtocol: ProtocolResponse | null = null;

  /** Indicates whether a request is in progress */
  loading = signal<boolean>(false);

  /** Total number of records for pagination */
  totalRecords = 0;

  /** Current page index (zero-based) */
  page = 0;

  /** Page size (rows per page) */
  size = 10;

  /** Current search term */
  searchTerm = '';

  /** Current sort configuration */
  sort: { field: string; order: 'asc' | 'desc' }[] = [];

  /** Breadcrumb service */
  private readonly breadcrumbService = inject(BreadcrumbService);

  /** Activated route for breadcrumb building */
  private readonly route = inject(ActivatedRoute);

  /**
   * Injects the ProtocolService used to retrieve protocol tracking data.
   */
  constructor(private protocolService: ProtocolService) {}

  /**
   * Lifecycle hook executed on component initialization.
   * Loads protocols for the current day by default.
   */
  ngOnInit(): void {
    this.breadcrumbService.buildFromRoute(this.route);
    this.loadProtocols();
  }

  /**
   * Handles search/filter events emitted by the search component.
   *
   * @param filters Object containing optional start date and end date with time boundaries.
   */
  onSearchFilters(filters: { start?: string; end?: string }) {
    this.selectedProtocol = null;
    this.page = 0;
    this.loading.set(true);

    this.protocolService.getTrackingProtocols({
      from: filters.start,
      to: filters.end
    }).subscribe({
      next: (protocols) => {
        this.applyFiltersAndPagination(protocols);
      },
      error: () => {
        this.protocols = [];
        this.totalRecords = 0;
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles the protocol selection event emitted by the search component or table.
   *
   * @param protocol The selected protocol or null if deselected.
   */
  onProtocolSelected(protocol: ProtocolResponse | null): void {
    this.selectedProtocol = protocol;
  }

  /**
   * Handles date filter changes from the protocol detail table
   */
  onDateFilterChange(filters: { start: string; end: string }): void {
    this.selectedProtocol = null;
    this.page = 0;
    this.loading.set(true);

    // Si las fechas están vacías, no enviar parámetros from y to
    const params = filters.start && filters.end
      ? { from: filters.start, to: filters.end }
      : {};

    this.protocolService.getTrackingProtocols(params).subscribe({
      next: (protocols) => {
        this.applyFiltersAndPagination(protocols);
      },
      error: () => {
        this.protocols = [];
        this.totalRecords = 0;
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles pagination change from the table
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.page = Math.floor(event.first / event.rows);
    this.size = event.rows;
    this.loadProtocols();
  }

  /**
   * Handles sorting changes from the table
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    this.sort = sortArray;
    this.page = 0;
    this.loadProtocols();
  }

  /**
   * Handles global filter changes from the table
   */
  onGlobalFilterChange(term: string): void {
    this.searchTerm = term;
    this.page = 0;
    this.loadProtocols();
  }

  /**
   * Loads protocols with current filters, pagination and sorting
   */
  private loadProtocols(): void {
    const today = new Date().toISOString().split('T')[0];
    const from = `${today}T00:00:00`;
    const to = `${today}T23:59:59`;

    this.loading.set(true);
    this.protocolService.getTrackingProtocols({ from, to }).subscribe({
      next: (protocols) => {
        this.applyFiltersAndPagination(protocols);
      },
      error: () => {
        this.protocols = [];
        this.totalRecords = 0;
        this.loading.set(false);
      }
    });
  }

  /**
   * Applies client-side filtering, sorting, and pagination to the protocols
   */
  private applyFiltersAndPagination(protocols: ProtocolResponse[]): void {
    // Apply client-side filtering if search term exists
    let filteredProtocols = protocols;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filteredProtocols = protocols.filter(p =>
        p.patientName.toLowerCase().includes(term) ||
        p.id.toString().includes(term) ||
        p.userCreator.toLowerCase().includes(term)
      );
    }

    // Apply client-side sorting if sort is configured
    if (this.sort.length > 0) {
      filteredProtocols = [...filteredProtocols].sort((a, b) => {
        for (const sortConfig of this.sort) {
          const field = sortConfig.field;
          const order = sortConfig.order === 'asc' ? 1 : -1;

          // Skip sorting by createdAtTime (hora de creación)
          if (field === 'createdAtTime') {
            continue;
          }

          let aValue: any;
          let bValue: any;

          switch (field) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'patientName':
            aValue = a.patientName;
            bValue = b.patientName;
            break;
          case 'createdAtDate':
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case 'userCreator':
            aValue = a.userCreator;
            bValue = b.userCreator;
            break;
          default:
            aValue = (a as any)[field];
            bValue = (b as any)[field];
          }

          if (aValue < bValue) return -1 * order;
          if (aValue > bValue) return 1 * order;
        }
        return 0;
      });
    }

    // Apply client-side pagination
    this.totalRecords = filteredProtocols.length;
    const start = this.page * this.size;
    const end = start + this.size;
    this.protocols = filteredProtocols.slice(start, end);
    this.loading.set(false);
  }
}
