import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';


import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { TableLazyLoadEvent } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import {
  AdvancedTableComponent,
  GenericColumn,
  TableAction
} from 'src/app/shared/components/advanced-table/advanced-table.component';
import {
  GenericAlertComponent
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import {
  ResponseBatchDTO,
  BatchFiltersDTO,
  BatchValidationConstants,
  BatchStatus
} from '../../../models/batches/batches.model';
import { BatchesService } from '../../../services/batches.service';

/**
 * Component for listing batches
 */
@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdvancedTableComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    TextareaModule,
    MenuModule,
    ToolbarModule
  ],
  templateUrl: './batches-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchesListComponent implements OnInit, AfterViewInit {
  // Templates
  @ViewChild('statusTemplate', { static: false })
    statusTemplate!: TemplateRef<any>;
  @ViewChild('activeTemplate', { static: false })
    activeTemplate!: TemplateRef<any>;
  @ViewChild('dateTemplate', { static: false })
    dateTemplate!: TemplateRef<any>;
  @ViewChild('quantityTemplate', { static: false })
    quantityTemplate!: TemplateRef<any>;

  // Data
  batches: ResponseBatchDTO[] = [];
  totalRecords = 0;
  loading = false;

  // Filters
  filters: BatchFiltersDTO = {
    page: 0,
    size: BatchValidationConstants.DEFAULT_PAGE_SIZE,
    sortBy: 'id',
    sortDirection: 'desc',
    isActive: false
  };

  // Search
  searchTerm = '';
  statusFilter: BatchStatus | null = null;
  activeFilter: boolean | null = null;

  // Help content
  helpContent = `
    <div style="line-height: 1.6;">
      <p><strong>Welcome to Batch Management</strong></p>
      <p>Control the lifecycle of each product batch, from receipt to depletion or expiration.</p>

      <h4>Batch Statuses:</h4>
      <ul>
        <li><strong>Active:</strong> <span style="color: #4CAF50;">●</span> Batch available for use</li>
        <li><strong>Expired:</strong> <span style="color: #F44336;">●</span> Past expiration date</li>
        <li><strong>Depleted:</strong> <span style="color: #9E9E9E;">●</span> Out of stock</li>
      </ul>

      <h4>Available Actions:</h4>
      <ul style="list-style: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><i class="pi pi-plus" style="color: #4CAF50;"></i> <strong>Add:</strong> Register a new batch in the system</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-eye" style="color: #2196F3;"></i> <strong>View:</strong> See complete batch details (quantity, dates, location)</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-pencil" style="color: #FF9800;"></i> <strong>Edit:</strong> Modify batch information (only if editable)</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-ban" style="color: #F44336;"></i> <strong>Deactivate:</strong> Disable an active batch (requires reason)</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-check-circle" style="color: #4CAF50;"></i> <strong>Reactivate:</strong> Re-enable a deactivated batch</li>
      </ul>

      <h4>Key Information:</h4>
      <p>Each batch includes:</p>
      <ul>
        <li><strong>Batch Code:</strong> Unique manufacturer identifier</li>
        <li><strong>Supply and Supplier:</strong> Product and its origin</li>
        <li><strong>Dates:</strong> Manufacturing and expiration</li>
        <li><strong>Quantities:</strong> Initial, current, and reserved</li>
      </ul>

      <h4>Filters:</h4>
      <p>Use the <i class="pi pi-filter" style="color: #2196F3;"></i> button to filter by:</p>
      <ul>
        <li><strong>Batch Status:</strong> Active, Expired, Depleted</li>
        <li><strong>Activation Status:</strong> Active/Inactive</li>
      </ul>

      <h4>Search:</h4>
      <p>Search for batches by code, supply name, or supplier.</p>

      <h4>Export Data:</h4>
      <p>Click the download button to export the complete list to Excel.</p>
    </div>
  `;

  // Filter options
  activeOptions = [
    { label: 'All', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Active', value: BatchStatus.ACTIVE },
    { label: 'Expired', value: BatchStatus.EXPIRED },
    { label: 'Depleted', value: BatchStatus.DEPLETED }
  ];

  // Table settings
  columns: GenericColumn[] = [
    { field: 'batchCode', header: 'Code' },
    { field: 'supplyName', header: 'Supply' },
    { field: 'supplierName', header: 'Supplier' },
    { field: 'manufacturingDate', header: 'Manuf. Date' },
    { field: 'expirationDate', header: 'Exp. Date' },
    { field: 'initialQuantity', header: 'Initial Quantity' },
    { field: 'status', header: 'Status' },
    { field: 'isActive', header: 'Active' }
  ];

  tableActions: TableAction[] = [
    { type: 'view', label: 'View', icon: 'pi pi-eye' },
    { type: 'edit', label: 'Edit', icon: 'pi pi-pencil' },
    { type: 'deactivate', label: 'Deactivate', icon: 'pi pi-ban' },
    { type: 'reactivate', label: 'Reactivate', icon: 'pi pi-check-circle' }
  ];

  /**
   * Gets the available actions for a batch based on its status
   */
  getRowActionsForBatch = (row: Record<string, any>): TableAction[] => {
    const batch = row as ResponseBatchDTO;
    if (!batch.isActive) {
      return this.tableActions.filter(a => a.type !== 'deactivate');
    }
    return this.tableActions.filter(a => a.type !== 'reactivate');
  };

  // Alerts
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  showAlert = false;

  // Deactivation modal
  showDeactivationModal = false;
  deactivationReason = '';
  deactivationReasonError = '';
  batchToDeactivate: ResponseBatchDTO | null = null;

  private batchesService = inject(BatchesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private pageTitleService = inject(PageTitleService);
  private dialogService = inject(DialogService);
  private dialogRef: DynamicDialogRef | undefined;

  /**
   * Initialization
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Batch Management');
    this.loadBatches();
  }

  /**
   * Assign templates to columns after the view has been initialized
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'batchCode', header: 'Code' },
      { field: 'supplyName', header: 'Supply' },
      { field: 'supplierName', header: 'Supplier' },
      {
        field: 'manufacturingDate',
        header: 'Manuf. Date',
        template: this.dateTemplate
      },
      {
        field: 'expirationDate',
        header: 'Exp. Date',
        template: this.dateTemplate
      },
      {
        field: 'initialQuantity',
        header: 'Initial Quantity',
        template: this.quantityTemplate
      },
      { field: 'status', header: 'Status', template: this.statusTemplate },
      { field: 'isActive', header: 'Active', template: this.activeTemplate }
    ];
    this.cdr.markForCheck();
  }

  /**
   * Load batches with current filters
   */
  loadBatches(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const searchFilters: BatchFiltersDTO = {
      ...this.filters,
      batchCode: this.searchTerm || undefined,
      isActive: this.activeFilter !== null ? this.activeFilter : false,
      status: this.statusFilter || undefined
    };

    this.batchesService.searchBatches(searchFilters).subscribe({
      next: (response) => {
        this.batches = response.batches;
        this.totalRecords = response.totalElements;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (_error) => {
        this.showError('Error al cargar los lotes');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle table lazy loading
   */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filters.page = event.first
      ? Math.floor(event.first / (event.rows || 10))
      : 0;
    this.filters.size = event.rows || BatchValidationConstants.DEFAULT_PAGE_SIZE;

    if (event.sortField) {
      this.filters.sortBy = event.sortField as string;
      this.filters.sortDirection = event.sortOrder === 1 ? 'asc' : 'desc';
    }

    this.loadBatches();
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.filters.page = 0;
    this.loadBatches();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = null;
    this.activeFilter = null;
    this.filters = {
      page: 0,
      size: BatchValidationConstants.DEFAULT_PAGE_SIZE,
      sortBy: 'id',
      sortDirection: 'desc',
      isActive: false
    };
    this.loadBatches();
  }

  /**
   * Handle table actions
   */
  onTableAction(event: { type: string; row: Record<string, any> }): void {
    const batch = event.row as ResponseBatchDTO;

    // Filter invalid actions based on state
    if (event.type === 'deactivate' && !batch.isActive) {
      return; // Do not allow deactivating an already inactive batch
    }
    if (event.type === 'reactivate' && batch.isActive) {
      return; // Do not allow reactivating an already active batch
    }

    switch (event.type) {
    case 'view':
      this.viewBatch(batch);
      break;
    case 'edit':
      this.editBatch(batch);
      break;
    case 'deactivate':
      this.deactivateBatch(batch);
      break;
    case 'reactivate':
      this.reactivateBatch(batch);
      break;
    }
  }

  /**
   * View batch
   */
  viewBatch(batch: ResponseBatchDTO): void {
    this.router.navigate(['/procurement-inventory/batches', batch.id, 'view']);
  }

  /**
   * Edit batch
   */
  editBatch(batch: ResponseBatchDTO): void {
    this.router.navigate(['/procurement-inventory/batches', batch.id, 'edit']);
  }

  /**
   * Deactivate batch
   */
  deactivateBatch(batch: ResponseBatchDTO): void {
    this.batchToDeactivate = batch;
    this.deactivationReason = '';
    this.deactivationReasonError = '';
    this.showDeactivationModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Reactivate a batch (functionality not yet implemented)
   */
  reactivateBatch(_batch: ResponseBatchDTO): void {
    this.showError('La funcionalidad de reactivación aún no está implementada');
  }

  /**
   * Confirm deactivation
   */
  confirmDeactivation(): void {
    if (!this.batchToDeactivate) {
      this.closeDeactivationModal();
      return;
    }

    // Validate that the reason is not empty
    if (!this.deactivationReason || this.deactivationReason.trim().length === 0) {
      this.deactivationReasonError = 'El motivo de desactivación es obligatorio';
      this.cdr.markForCheck();
      return;
    }

    // Clear error if validation passes
    this.deactivationReasonError = '';

    this.batchesService
      .deactivateBatch(this.batchToDeactivate.id, this.deactivationReason)
      .subscribe({
        next: () => {
          this.showSuccess('Lote desactivado exitosamente');
          this.closeDeactivationModal();
          this.loadBatches();
        },
        error: (error) => {
          const errorMessage = error?.error?.message || 'Error deactivating batch';
          this.showError(errorMessage);
          this.closeDeactivationModal();
        }
      });
  }

  /**
   * Close deactivation modal
   */
  closeDeactivationModal(): void {
    this.showDeactivationModal = false;
    this.deactivationReason = '';
    this.deactivationReasonError = '';
    this.batchToDeactivate = null;
    this.cdr.markForCheck();
  }

  /**
   * Get modal message
   */
  get deactivationModalMessage(): string {
    const batchCode = this.batchToDeactivate?.batchCode || '';
    return `Are you sure you want to deactivate batch "${batchCode}"? Please enter the reason:`;
  }

  /**
   * Create new batch in modal
   */
  createBatch(): void {
    import('../create/create-batch.component').then(m => {
      this.dialogRef = this.dialogService.open(m.CreateBatchComponent, {
        header: 'Create New Batch',
        width: '90vw',
        style: { 'max-width': '1200px' },
        modal: true,
        dismissableMask: false,
        styleClass: 'batch-dialog'
      });

      this.dialogRef.onClose.subscribe((result) => {
        if (result?.success) {
          this.showSuccess('Lote creado exitosamente');
          this.loadBatches();
        }
      });
    });
  }

  /**
   * Update expired batches
   */
  updateExpiredBatches(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.batchesService.updateExpiredBatches().subscribe({
      next: (message) => {
        this.showSuccess(message);
        this.loadBatches();
      },
      error: () => {
        this.showError('Error al actualizar lotes vencidos');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
  /**
   * Show success alert
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Show error alert
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Formats the batch status to be displayed in Spanish
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Activo',
      'EXPIRED': 'Vencido',
      'DEPLETED': 'Agotado'
    };
    return statusMap[status] || status;
  }

  /**
   * Formats boolean values
   */
  formatBoolean(value: boolean): string {
    return value ? 'Sí' : 'No';
  }
}
