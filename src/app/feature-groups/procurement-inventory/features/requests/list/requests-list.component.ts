import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableLazyLoadEvent } from 'primeng/table';

import { AdvancedTableComponent, TableAction } from '../../../../../shared/components/advanced-table/advanced-table.component';
import { RequestFiltersDTO, RequestResponseDTO } from '../../../models/requests/requests.models';
import { RequestsService } from '../../../services/requests/requests.service';
import { PageResponse } from '../../../shared/utils/pagination';

/**
  / * Displays and manages the list of procurement requests, including filtering, pagination, and navigation.
 */
@Component({
  selector: 'app-requests-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputNumberModule,
    AdvancedTableComponent
  ],
  templateUrl: './requests-list.component.html',
  styleUrls: ['./requests-list.component.css']
})
export class RequestsListComponent implements OnInit {
  private readonly requestsService = inject(RequestsService);
  private readonly router = inject(Router);

  // Data
  requests: RequestResponseDTO[] = [];
  totalRecords = 0;
  loading = false;

  // Filters
  filters: RequestFiltersDTO = {
    page: 0,
    size: 10,
    sort: 'creationDate,desc'
  };

  // Filter options
  statusOptions = [
    { label: 'Pendiente', value: 'PENDING' },
    { label: 'Aprobada', value: 'APPROVED' },
    { label: 'Rechazada', value: 'REJECTED' },
    { label: 'Enviada', value: 'SENT' },
    { label: 'Completada', value: 'COMPLETED' }
  ];

  // Table configuration
  tableConfig = {
    showGlobalFilter: true,
    showActions: true,
    showAddButton: false, // Requests are read-only
    showFilterButton: true,
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    lazy: true
  };

  // Table columns
  columns = [
    { key: 'id', header: 'ID', type: 'number' as const },
    { key: 'creationDate', header: 'Fecha de Creación', type: 'text' as const },
    { key: 'originLocationName', header: 'Ubicación Origen', type: 'text' as const },
    { key: 'destinationLocationName', header: 'Ubicación Destino', type: 'text' as const },
    { key: 'status', header: 'Estado', type: 'text' as const },
    { key: 'observations', header: 'Observaciones', type: 'text' as const }
  ];

  // Table actions
  actions: TableAction[] = [
    {
      type: 'view',
      label: 'Ver',
      icon: 'pi pi-eye'
    }
  ];

  /**
   * Inicializa el componente y carga las solicitudes
   */
  ngOnInit(): void {
    this.loadRequests();
  }


  /**
   * Carga la lista de solicitudes con los filtros aplicados
   */
  loadRequests(): void {
    this.loading = true;
    this.requestsService.search(this.filters).subscribe({
      next: (response: PageResponse<RequestResponseDTO>) => {
        this.requests = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (_error) => {
        // Error loading requests
        this.loading = false;
      }
    });
  }


  /**
   * Maneja la carga perezosa de datos de la tabla
   * @param event - Evento de carga perezosa con paginación y ordenamiento
   */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filters.page = event.first ? Math.floor(event.first / (event.rows || 10)) : 0;
    this.filters.size = event.rows || 10;
    this.filters.sort = event.sortField ? `${event.sortField},${event.sortOrder === 1 ? 'asc' : 'desc'}` : 'creationDate,desc';

    this.loadRequests();
  }


  /**
   * Maneja las acciones de la tabla (ver, editar, etc.)
   * @param event - Evento con tipo de acción y fila seleccionada
   */
  onAction(event: { type: string; row: RequestResponseDTO }): void {
    const { type, row } = event;

    switch (type) {
    case 'view':
      this.router.navigate(['/procurement-inventory/requests', row.id]);
      break;
    }
  }


  /**
   * Maneja el cambio de filtros y recarga los datos
   */
  onFilterChange(): void {
    this.filters.page = 0;
    this.loadRequests();
  }


  /**
   * Limpia todos los filtros y recarga los datos
   */
  clearFilters(): void {
    this.filters = {
      page: 0,
      size: 10,
      sort: 'creationDate,desc'
    };
    this.loadRequests();
  }
}
