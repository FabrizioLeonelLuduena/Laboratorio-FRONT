import { CommonModule } from '@angular/common';
/* eslint-disable jsdoc/require-description */
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableLazyLoadEvent } from 'primeng/table';

import { AdvancedTableComponent, TableAction } from '../../../../../shared/components/advanced-table/advanced-table.component';
import { PurchaseOrderDetailDTO } from '../../../models/purchase-order-details/purchase-order-details.models';
import { PurchaseOrderDetailsService } from '../../../services/purchase-order-details/purchase-order-details.service';

/**
   * Método del componente
 */
@Component({
  selector: 'app-purchase-order-details-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    AdvancedTableComponent
  ],
  templateUrl: './purchase-order-details-list.component.html',
  styleUrls: ['./purchase-order-details-list.component.css']
})
export class PurchaseOrderDetailsListComponent implements OnInit {
  private readonly purchaseOrderDetailsService = inject(PurchaseOrderDetailsService);
  private readonly router = inject(Router);

  // Data
  purchaseOrderDetails: PurchaseOrderDetailDTO[] = [];
  totalRecords = 0;
  loading = false;

  // Filters - simplified since there's no dedicated filter DTO
  filters = {
    page: 0,
    size: 10,
    sort: 'id,desc'
  };

  // Table configuration
  tableConfig = {
    showGlobalFilter: true,
    showActions: true,
    showAddButton: true,
    showFilterButton: true,
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    lazy: true
  };

  // Table columns
  columns = [
    { key: 'id', header: 'ID', type: 'number' as const },
    { key: 'purchaseOrderId', header: 'ID Orden de Compra', type: 'number' as const },
    { key: 'supplyName', header: 'Insumo', type: 'text' as const },
    { key: 'requestedQuantity', header: 'Cantidad Solicitada', type: 'number' as const },
    { key: 'receivedQuantity', header: 'Cantidad Recibida', type: 'number' as const },
    { key: 'unitPrice', header: 'Precio Unitario', type: 'number' as const },
    { key: 'isActive', header: 'Activo', type: 'text' as const }
  ];

  // Table actions
  actions: TableAction[] = [
    {
      type: 'view',
      label: 'Ver',
      icon: 'pi pi-eye'
    },
    {
      type: 'edit',
      label: 'Editar',
      icon: 'pi pi-pencil'
    },
    {
      type: 'deactivate',
      label: 'Desactivar',
      icon: 'pi pi-trash'
    }
  ];

  // Confirmation modal
  showConfirmModal = false;
  itemToDeactivate: PurchaseOrderDetailDTO | null = null;


  /**
   * Método del componente
   */
  ngOnInit(): void {
    this.loadPurchaseOrderDetails();
  }


  /**
   * Loads all purchase order details
   * Note: The service doesn't have a generic search method,
   * so this would need to be implemented or use getByPurchaseOrder with a specific ID
   */
  loadPurchaseOrderDetails(): void {
    this.loading = true;
    // Since there's no generic search/list method in the service,
    // we'll need to show a message or implement the backend endpoint
    // For now, initialize with empty array
    this.purchaseOrderDetails = [];
    this.totalRecords = 0;
    this.loading = false;

    // TODO: Implement a generic list/search endpoint in the backend
    // or require a purchase order ID to filter
  }


  /**
   * Método del componente
   */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filters.page = event.first ? Math.floor(event.first / (event.rows || 10)) : 0;
    this.filters.size = event.rows || 10;
    this.filters.sort = event.sortField ? `${event.sortField},${event.sortOrder === 1 ? 'asc' : 'desc'}` : 'id,desc';

    this.loadPurchaseOrderDetails();
  }


  /**
   * Método del componente
   */
  onAddClick(): void {
    this.router.navigate(['/procurement-inventory/purchase-order-details/create']);
  }


  /**
   * Método del componente
   */
  onAction(event: { type: string; row: PurchaseOrderDetailDTO }): void {
    const { type, row } = event;

    switch (type) {
    case 'view':
      this.router.navigate(['/procurement-inventory/purchase-order-details', row.id]);
      break;
    case 'edit':
      this.router.navigate(['/procurement-inventory/purchase-order-details', row.id, 'edit']);
      break;
    case 'deactivate':
      this.itemToDeactivate = row;
      this.showConfirmModal = true;
      break;
    }
  }


  /**
   * Método del componente
   */
  onConfirmDeactivate(): void {
    if (this.itemToDeactivate) {
      this.purchaseOrderDetailsService.deactivate(this.itemToDeactivate.id).subscribe({
        next: () => {
          this.loadPurchaseOrderDetails();
          this.showConfirmModal = false;
          this.itemToDeactivate = null;
        },
        error: (_error: any) => {
          // Error deactivating purchase order detail
          this.showConfirmModal = false;
          this.itemToDeactivate = null;
        }
      });
    }
  }


  /**
   * Método del componente
   */
  onCancelDeactivate(): void {
    this.showConfirmModal = false;
    this.itemToDeactivate = null;
  }


  /**
   * Método del componente
   */
  onFilterChange(): void {
    this.filters.page = 0;
    this.loadPurchaseOrderDetails();
  }


  /**
   * Método del componente
   */
  clearFilters(): void {
    this.filters = {
      page: 0,
      size: 10,
      sort: 'id,desc'
    };
    this.loadPurchaseOrderDetails();
  }
}
