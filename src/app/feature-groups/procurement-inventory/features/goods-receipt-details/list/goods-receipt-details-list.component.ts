import { CommonModule } from '@angular/common';
/* eslint-disable jsdoc/require-description */
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableLazyLoadEvent } from 'primeng/table';

import { AdvancedTableComponent, TableAction } from '../../../../../shared/components/advanced-table/advanced-table.component';
import { ConfirmationModalComponent } from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GoodsReceiptDetailFiltersDTO, ResponseGoodsReceiptDetailDTO } from '../../../models/goods-receipt-details/goods-receipt-details.models';
import { GoodsReceiptDetailsService } from '../../../services/goods-receipt-details/goods-receipt-details.service';
import { PageResponse } from '../../../shared/utils/pagination';

/**
 * Goods Receipt Details List Component
 * Manages the list of goods receipt details.
 */
@Component({
  selector: 'app-goods-receipt-details-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    AdvancedTableComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './goods-receipt-details-list.component.html',
  styleUrls: ['./goods-receipt-details-list.component.css']
})
export class GoodsReceiptDetailsListComponent implements OnInit {
  private readonly goodsReceiptDetailsService = inject(GoodsReceiptDetailsService);
  private readonly router = inject(Router);

  // Data
  goodsReceiptDetails: ResponseGoodsReceiptDetailDTO[] = [];
  totalRecords = 0;
  loading = false;

  // Filters
  filters: GoodsReceiptDetailFiltersDTO = {
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
    { key: 'goodsReceiptId', header: 'ID Recepción', type: 'number' as const },
    { key: 'supplyName', header: 'Insumo', type: 'text' as const },
    { key: 'batchId', header: 'ID Lote', type: 'number' as const },
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
  itemToDeactivate: ResponseGoodsReceiptDetailDTO | null = null;


  /**
   * Método del componente
   */
  ngOnInit(): void {
    this.loadGoodsReceiptDetails();
  }


  /**
   * Método del componente
   */
  loadGoodsReceiptDetails(): void {
    this.loading = true;
    this.goodsReceiptDetailsService.search(this.filters).subscribe({
      next: (response: PageResponse<ResponseGoodsReceiptDetailDTO>) => {
        this.goodsReceiptDetails = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (_error) => {
        // Error loading goods receipt details
        this.loading = false;
      }
    });
  }


  /**
   * Método del componente
   */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filters.page = event.first ? Math.floor(event.first / (event.rows || 10)) : 0;
    this.filters.size = event.rows || 10;
    this.filters.sort = event.sortField ? `${event.sortField},${event.sortOrder === 1 ? 'asc' : 'desc'}` : 'id,desc';
    
    this.loadGoodsReceiptDetails();
  }


  /**
   * Método del componente
   */
  onAddClick(): void {
    this.router.navigate(['/procurement-inventory/goods-receipt-details/create']);
  }


  /**
   * Método del componente
   */
  onAction(event: { type: string; row: Record<string, any> }): void {
    const { type, row } = event;
    
    switch (type) {
    case 'view':
      this.router.navigate(['/procurement-inventory/goods-receipt-details', row['id']]);
      break;
    case 'edit':
      this.router.navigate(['/procurement-inventory/goods-receipt-details', row['id'], 'edit']);
      break;
    case 'deactivate':
      this.itemToDeactivate = row as ResponseGoodsReceiptDetailDTO;
      this.showConfirmModal = true;
      break;
    }
  }


  /**
   * Método del componente
   */
  onConfirmDeactivate(): void {
    if (this.itemToDeactivate) {
      this.goodsReceiptDetailsService.deactivate(this.itemToDeactivate.id).subscribe({
        next: () => {
          this.loadGoodsReceiptDetails();
          this.showConfirmModal = false;
          this.itemToDeactivate = null;
        },
        error: (_error) => {
          // Error deactivating goods receipt detail
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
    this.loadGoodsReceiptDetails();
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
    this.loadGoodsReceiptDetails();
  }
}
