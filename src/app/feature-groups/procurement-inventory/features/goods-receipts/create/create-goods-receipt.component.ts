import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
// App absolute imports
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

// Parent relative imports
import { DeliveryNoteStatus } from '../../../models/goods-receipts/goods-receipts.models';
import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';
import { GoodsReceiptsService } from '../../../services/goods-receipts/goods-receipts.service';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';
import { StockMovementsService } from '../../../services/stock-movements/stock-movements.service';
import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { SuppliersService } from '../../../services/suppliers.service';


/**
 * Interface for delivery note detail items in the grid
 */
interface DeliveryNoteDetailItem {
  supplierItemId?: number;
  supplierItemName?: string;
  requestedQuantity?: number;
  receivedQuantity?: number;
  batchNumber?: string;
  expirationDate?:string;
  batchNotes?: string;

}

/**
 * Component for creating delivery notes (goods receipts)
 * Uses editable grid pattern like stock movements
 */
@Component({
  selector: 'app-create-goods-receipt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    DatePickerModule,
    DropdownModule,
    SelectModule,
    SkeletonModule,
    ToastModule,
    TooltipModule,
    GenericButtonComponent
  ],
  providers: [MessageService],
  templateUrl: './create-goods-receipt.component.html',
  styleUrl: './create-goods-receipt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateGoodsReceiptComponent implements OnInit {
  // Basic data
  basicData: any = {
    purchaseOrderId: null,
    supplierId: null,
    status: DeliveryNoteStatus.PENDING,
    batchNotes: ''
  };

  // Details grid
  details: DeliveryNoteDetailItem[] = [];

  saving = false;
  loadingPreloadedData = false;

  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  isPurchaseOrderPreselected = false;

  // Lists for dropdowns
  suppliers: ResponseSupplierDTO[] = [];
  purchaseOrders: Array<{ label: string; value: number }> = [];
  supplierItems: Array<{ id: number; name: string; description: string }> = [];

  // Status options
  statusOptions = [
    { label: 'Pendiente', value: DeliveryNoteStatus.PENDING },
    { label: 'Recibida', value: DeliveryNoteStatus.RECEIVED },
    { label: 'Devuelta', value: DeliveryNoteStatus.RETURNED },
    { label: 'Cancelada', value: DeliveryNoteStatus.CANCELLED }
  ];

  private goodsReceiptsService = inject(GoodsReceiptsService);
  private suppliersService = inject(SuppliersService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private messageService = inject(MessageService);
  private purchaseOrdersService = inject(PurchaseOrdersService);
  private stockMovementsService = inject(StockMovementsService);
  private supplierItemsService = inject(SupplierItemsService);

  /**
   * Lifecycle hook: initializes breadcrumb and loads data
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Recepción de mercadería > Crear',
      '/procurement-inventory/goods-receipts'
    );

    // Check if there's preloaded data from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || (history.state as any);

    // Store preloaded data to apply after suppliers and items are loaded
    const preloadData = state?.preloadData;

    // Show loading spinner if there's preloaded data
    if (preloadData) {
      this.loadingPreloadedData = true;
      this.cdr.markForCheck();
    }

    // Load data for dropdowns
    this.loadSuppliers();
    this.loadPurchaseOrders();
    this.loadSupplierItems().then(() => {
      // Apply preloaded data AFTER supplier items are loaded
      if (preloadData) {
        this.loadPreloadedData(preloadData);
      }
    });
  }

  /**
   * Load preloaded data from purchase order
   * @param preloadData - Data from purchase order to preload
   */
  private loadPreloadedData(preloadData: any): void {

    if (preloadData.purchaseOrderId) {
      this.basicData.purchaseOrderId = Number(preloadData.purchaseOrderId);
      this.isPurchaseOrderPreselected = true;
    }

    if (preloadData.supplierId) {
      this.basicData.supplierId = Number(preloadData.supplierId);
      this.loadSupplierItemsBySupplier(this.basicData.supplierId);
    }

    if (preloadData.status) {
      this.basicData.status = preloadData.status;
    }

    // Load details if provided
    if (preloadData.details && Array.isArray(preloadData.details)) {
      this.details = preloadData.details.map((detail: any) => {
        const supplierItemId = detail.supplierItemId ? Number(detail.supplierItemId) : undefined;

        return {
          supplierItemId: supplierItemId,
          supplierItemName: detail.supplierItemName,
          requestedQuantity: detail.requestedQuantity,
          receivedQuantity: detail.receivedQuantity || detail.requestedQuantity,
          batchNumber: detail.batchNumber || '',
          expirationDate: detail.expirationDate || undefined,
          batchNotes: detail.batchNotes || ''
        };
      });

    }

    // Hide loading spinner
    this.loadingPreloadedData = false;

    // Force Angular to detect changes
    this.cdr.detectChanges();
  }

  /**
   * Add a new empty item to the grid
   */
  addNewItem(): void {
    const newItem: DeliveryNoteDetailItem = {
      supplierItemId: undefined,
      requestedQuantity: undefined,
      receivedQuantity: undefined,
      batchNumber: '',
      expirationDate: undefined,
      batchNotes: ''
    };
    this.details.push(newItem);
    this.cdr.markForCheck();
  }

  /**
   * Remove an item from the grid
   * @param index - Index of the item to remove
   */
  removeDetail(index: number): void {
    if (index >= 0 && index < this.details.length) {
      this.details.splice(index, 1);
      this.cdr.markForCheck();
      this.messageService.add({
        severity: 'info',
        summary: 'Item eliminado',
        detail: 'El item fue eliminado de la lista.'
      });
    }
  }

  /**
   * Handle supplier item change
   * @param supplierItemId - Selected supplier item ID
   * @param index - Index of the item in the grid
   */
  onSupplierItemChange(supplierItemId: number | undefined, index: number): void {
    if (!supplierItemId) return;

    const item = this.supplierItems.find(si => si.id === supplierItemId);
    if (item && this.details[index]) {
      this.details[index].supplierItemName = item.name;
      this.cdr.markForCheck();
    }
  }

  /**
   * Gets the name of the selected supplier item for tooltip
   */
  getSupplierItemName(supplierItemId: number): string {
    const item = this.supplierItems.find(si => si.id === supplierItemId);
    return item ? item.name : '';
  }

  /**
   * Main submit method - validates and creates the delivery note
   */
  onSubmit(): void {
    // Validate form data
    if (!this.validateData()) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Prepare the payload
    const payload: any = {
      status: this.basicData.status || DeliveryNoteStatus.PENDING,
      purchaseOrderId: Number(this.basicData.purchaseOrderId),
      supplierId: Number(this.basicData.supplierId),
      details: this.details.map(detail => {
        const d: any = {
          receivedQuantity: Number(detail.receivedQuantity),
          supplierItemId: Number(detail.supplierItemId)
        };

        // Include requestedQuantity if provided
        if (detail.requestedQuantity !== undefined && detail.requestedQuantity !== null) {
          d.requestedQuantity = Number(detail.requestedQuantity);
        }

        if (detail.batchNumber) {
          d.batchNumber = detail.batchNumber;
        }

        if (detail.expirationDate) {
          d.expirationDate = this.formatDateForBackend(detail.expirationDate);
        }

        if (detail.batchNotes) {
          d.batchNotes = detail.batchNotes;
        }

        return d;
      })
    };

    // Submit to backend
    this.goodsReceiptsService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Nota de entrega creada exitosamente');
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/goods-receipts']);
        }, 2000);
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.extractErrorMessage(error));
      }
    });
  }

  /**
   * Cancel creation and navigate back
   */
  onCancel(): void {
    this.router.navigate(['/procurement-inventory/goods-receipts']);
  }

  /**
   * Navigate back to goods receipts list
   */
  onBack(): void {
    this.router.navigate(['/procurement-inventory/goods-receipts']);
  }

  /**
   * Validate form data before submission
   */
  private validateData(): boolean {
    // Validate basic data
    if (!this.basicData.purchaseOrderId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debe seleccionar una orden de compra.'
      });
      return false;
    }

    if (!this.basicData.supplierId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debe seleccionar un proveedor.'
      });
      return false;
    }

    // Validate details
    if (this.details.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Detalles requeridos',
        detail: 'Debe agregar al menos un item a la nota de entrega.'
      });
      return false;
    }

    // Validate each detail
    for (let i = 0; i < this.details.length; i++) {
      const detail = this.details[i];

      if (!detail.supplierItemId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Item requerido',
          detail: `El item #${i + 1} debe tener un producto seleccionado.`
        });
        return false;
      }

      if (!detail.receivedQuantity || detail.receivedQuantity <= 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cantidad inválida',
          detail: `El item #${i + 1} debe tener una cantidad mayor a 0.`
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Load suppliers list
   */
  private loadSuppliers(): void {
    this.suppliersService.getActiveSuppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.cdr.markForCheck();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proveedores.'
        });
      }
    });
  }

  /**
   * Load purchase orders list
   */
  private loadPurchaseOrders(): void {
    const filters = { page: 0, size: 50, isActive: true } as any;
    this.purchaseOrdersService.search(filters).subscribe({
      next: (res: any) => {
        let orders = [];
        if (Array.isArray(res)) {
          orders = res;
        } else if (res && Array.isArray(res.content)) {
          orders = res.content;
        }

        this.purchaseOrders = orders.map((po: any) => ({
          label: `${po.purchaseOrderNumber || ''}`,
          value: po.id
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.purchaseOrders = [];
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar las órdenes de compra.'
        });
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load supplier items list
   * Returns a Promise that resolves when items are loaded
   */
  private loadSupplierItems(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stockMovementsService.getSupplierItems().subscribe({
        next: (items) => {
          this.supplierItems = (items || []).map((it: any) => ({
            id: it.id,
            name: it.itemCode ? `${it.itemCode} - ${it.description}` : it.description,
            description: it.description
          }));
          this.cdr.markForCheck();
          resolve();
        },
        error: () => {
          this.supplierItems = [];
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar los items del proveedor.'
          });
          this.cdr.markForCheck();
          reject();
        }
      });
    });
  }

  /**
   * Load supplier items filtered by supplier ID
   * @param supplierId - ID of the supplier to filter items
   */
  loadSupplierItemsBySupplier(supplierId: number): void {
    if (!supplierId) {
      this.supplierItems = [];
      this.cdr.markForCheck();
      return;
    }

    this.supplierItemsService.getBySupplier(supplierId).subscribe({
      next: (items) => {
        this.supplierItems = (items || []).map((it: any) => ({
          id: it.id,
          name: it.itemCode ? `${it.itemCode} - ${it.description}` : it.description,
          description: it.description
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.supplierItems = [];
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los items del proveedor seleccionado.'
        });
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle supplier change event
   * Loads supplier items for the selected supplier
   */
  onSupplierChange(): void {
    if (this.basicData.supplierId) {
      // Clear current supplier items and details
      this.supplierItems = [];
      this.details = [];

      // Load supplier items for the selected supplier
      this.loadSupplierItemsBySupplier(this.basicData.supplierId);
    } else {
      this.supplierItems = [];
      this.details = [];
    }
    this.cdr.markForCheck();
  }

  /**
   * Format date for backend (yyyy-MM-dd)
   */
  private formatDateForBackend(date: Date | string | undefined | null): string {
    if (!date) return '';

    if (typeof date === 'string') {
      return date.split('T')[0];
    }

    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Shows alert message with auto-dismiss after 5 seconds
   */
  private showAlertMessage(message: string, type: AlertType): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Shows success alert
   */
  private showSuccess(message: string): void {
    this.showAlertMessage(message, 'success');
  }

  /**
   * Shows error alert
   */
  private showError(message: string): void {
    this.showAlertMessage(message, 'error');
  }

  /**
   * Extracts error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    }

    switch (error.status) {
    case 400:
      return 'Solicitud incorrecta. Verifique los datos ingresados.';
    case 401:
      return 'No autorizado. Por favor inicie sesión.';
    case 403:
      return 'Prohibido. No tiene permiso para realizar esta acción.';
    case 404:
      return 'No encontrado. El recurso solicitado no existe.';
    case 500:
      return 'Error interno del servidor. Inténtelo más tarde.';
    default:
      return 'Ocurrió un error inesperado. Inténtelo nuevamente.';
    }
  }
}
