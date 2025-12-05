import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericSelectOption } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { RequestDeliveryNoteDetailDTO } from '../../../models/goods-receipt-details/goods-receipt-details.models';
import {
  DeliveryNoteStatus,
  DeliveryNoteUpdateDTO,
  ResponseDeliveryNoteDTO
} from '../../../models/goods-receipts/goods-receipts.models';
import { GoodsReceiptsService } from '../../../services/goods-receipts/goods-receipts.service';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';
import { SuppliersService } from '../../../services/suppliers.service';

/**
 * Grid columns
 */
const GRID_COLUMNS = 2;

/**
 * Delivery note detail form item
 */
type DeliveryNoteDetailFormItem = {
  supplierItemId: number | string;
  receivedQuantity: number | string;
  requestedQuantity?: number | string;
  batchId?: number | string;
  detailId?: number;
  supplierItemName?: string;
  batchNumber?: string;
  expirationDate?: string;
  notes?: string;
  // Campos para rastrear el estado original del lote
  originalBatchId?: number;
  originalBatchNumber?: string;
  originalExpirationDate?: string;
  originalBatchNotes?: string;
};

/**
 * Delivery note form data
 */
type DeliveryNoteFormData = {
  purchaseOrderId?: number | string;
  supplierId?: number | string;
  status?: DeliveryNoteStatus | string;
  receiptDate: Date | string;
  notes?: string;
};

/**
 * Edit goods receipt component
 */
@Component({
  selector: 'app-edit-goods-receipt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    GenericFormComponent,
    PanelModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    TooltipModule,
    GenericButtonComponent
  ],
  templateUrl: './edit-goods-receipt.component.html',
  styleUrl: './edit-goods-receipt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditGoodsReceiptComponent implements OnInit {
  readonly gridColumns = GRID_COLUMNS;

  @ViewChild(GenericFormComponent) formComponent?: GenericFormComponent;

  private goodsReceiptsService = inject(GoodsReceiptsService);
  private suppliersService = inject(SuppliersService);
  private purchaseOrdersService = inject(PurchaseOrdersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  private deliveryNoteId!: number;

  supplierItems: Array<{ id: number; name: string; description: string; batchId?: number }> = [];

  formFields: GenericFormField[] = [
    {
      name: 'purchaseOrderId',
      label: 'Orden de Compra',
      type: 'select',
      placeholder: 'Seleccione una orden de compra',
      required: true,
      colSpan: 1,
      options: [],
      filter: true,
      filterPlaceholder: 'Buscar orden',
      disabled: true
    },
    {
      name: 'supplierId',
      label: 'Proveedor',
      type: 'select',
      placeholder: 'Seleccione un proveedor',
      required: true,
      colSpan: 1,
      options: [],
      filter: true,
      filterPlaceholder: 'Buscar proveedor',
      disabled: true
    },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      required: true,
      colSpan: 1,
      options: [
        { label: 'Pendiente', value: DeliveryNoteStatus.PENDING },
        { label: 'Recibida', value: DeliveryNoteStatus.RECEIVED },
        { label: 'Devuelta', value: DeliveryNoteStatus.RETURNED },
        { label: 'Cancelada', value: DeliveryNoteStatus.CANCELLED }
      ],
      disabled: true
    },
    {
      name: 'receiptDate',
      label: 'Fecha de Recepción',
      type: 'date',
      required: true,
      colSpan: 1,
      disabled: true
    },
    {
      name: 'notes',
      label: 'Observaciones Generales',
      type: 'textarea',
      placeholder: 'Observaciones generales de la nota de entrega...',
      required: false,
      colSpan: GRID_COLUMNS,
      rows: 3
    }
  ];

  initialValue: DeliveryNoteFormData | null = null;
  details: DeliveryNoteDetailFormItem[] = [];

  saving = false;
  loading = true;

  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    this.deliveryNoteId = Number(this.route.snapshot.paramMap.get('id'));
    this.breadcrumbService.setFromString(
      'Compras e inventario > Recepción de mercadería > Editar',
      '/procurement-inventory/goods-receipts'
    );

    this.loadPurchaseOrders();
    this.loadSupplierItems();
    this.loadDeliveryNote();
  }

  /**
   * Submit the form
   * @param formData - The form data
   */
  onFormSubmit(formData: Record<string, any>): void {
    if (!formData) return;

    if (!this.details.length) {
      this.showAlert('warning', 'Detalles requeridos', 'Debés agregar al menos un item a la nota de entrega.');
      return;
    }

    const data = formData as DeliveryNoteFormData;

    if (!data.purchaseOrderId || !data.supplierId) {
      this.showAlert('warning', 'Campos requeridos', 'Seleccioná un proveedor y una orden de compra.');
      return;
    }

    const supplierIdValue = Number(data.supplierId);
    const purchaseOrderIdValue = Number(data.purchaseOrderId);

    const detailsPayload: RequestDeliveryNoteDetailDTO[] = [];

    for (let index = 0; index < this.details.length; index += 1) {
      const detail = this.details[index];

      const supplierItemIdValue =
        detail.supplierItemId !== undefined && detail.supplierItemId !== null
          ? Number(detail.supplierItemId)
          : NaN;

      const hasSupplierItem = Number.isFinite(supplierItemIdValue);
      const hasBatch = detail.batchId !== undefined && detail.batchId !== null;

      if (!hasSupplierItem && !hasBatch) {
        this.showAlert(
          'warning',
          'Item inválido',
          `El item #${index + 1} debe tener un ítem de proveedor o un lote asociado.`
        );
        return;
      }

      const receivedQuantityValue = Number(detail.receivedQuantity);

      if (!Number.isFinite(receivedQuantityValue) || receivedQuantityValue <= 0) {
        this.showAlert(
          'warning',
          'Cantidad inválida',
          `La cantidad recibida del item #${index + 1} debe ser mayor a 0.`
        );
        return;
      }

      const requestedQuantityValue =
        detail.requestedQuantity !== undefined && detail.requestedQuantity !== null
          ? Number(detail.requestedQuantity)
          : undefined;

      // Detectar si el lote fue modificado comparando con los valores originales
      const batchWasModified =
        detail.batchNumber !== detail.originalBatchNumber ||
        detail.expirationDate !== detail.originalExpirationDate ||
        detail.notes !== detail.originalBatchNotes;

      // Construir el payload del detalle
      const detailPayload: RequestDeliveryNoteDetailDTO = {
        deliveryNoteId: this.deliveryNoteId,
        supplierItemId: supplierItemIdValue,
        receivedQuantity: receivedQuantityValue,
        requestedQuantity: requestedQuantityValue
      };

      // Lógica de envío del lote:
      // - Si NO se modificó → enviar solo batchId
      // - Si se modificó → enviar batchNumber, expirationDate y batchNotes (sin batchId)
      if (batchWasModified) {
        // Lote modificado: enviar datos del nuevo lote (sin batchId)
        if (detail.batchNumber) {
          detailPayload.batchNumber = detail.batchNumber;
        }
        if (detail.expirationDate) {
          detailPayload.expirationDate = detail.expirationDate;
        }
        if (detail.notes) {
          detailPayload.batchNotes = detail.notes;
        }
      } else {
        // Lote NO modificado: enviar solo batchId si existe
        if (detail.batchId) {
          detailPayload.batchId = Number(detail.batchId);
        }
      }

      detailsPayload.push(detailPayload);
    }

    if (!Number.isFinite(supplierIdValue)) {
      this.showAlert('warning', 'Proveedor inválido', 'No se pudo determinar el proveedor asociado a la nota de entrega.');
      return;
    }

    if (!Number.isFinite(purchaseOrderIdValue)) {
      this.showAlert('warning', 'Orden de compra inválida', 'No se pudo determinar la orden de compra asociada a la nota de entrega.');
      return;
    }

    const payload: DeliveryNoteUpdateDTO = {
      status: data.status || DeliveryNoteStatus.PENDING,
      receipt_date: this.formatDateForBackend(data.receiptDate),
      notes: data.notes?.trim() || undefined,
      purchase_order_id: purchaseOrderIdValue,
      supplier_id: supplierIdValue,
      details: detailsPayload
    };

    this.saving = true;
    this.cdr.markForCheck();

    this.goodsReceiptsService.update(this.deliveryNoteId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showAlert('success', 'Éxito', 'Nota de entrega actualizada correctamente.');
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/goods-receipts']);
        }, 2000);
      },
      error: (error) => {
        this.saving = false;
        this.handleHttpError(error);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Remove the detail
   * @param index - The index
   */
  removeDetail(index: number): void {
    this.details.splice(index, 1);
    this.cdr.markForCheck();
  }

  /**
   * Add a new item to the details array
   */
  addNewItem(): void {
    this.details.push({
      supplierItemId: '',
      receivedQuantity: '',
      requestedQuantity: '',
      batchId: undefined,
      detailId: undefined,
      supplierItemName: ''
    });
    this.cdr.markForCheck();
  }

  /**
   * Gets the name of the selected supplier item for tooltip
   */
  getSupplierItemName(supplierItemId: number | string): string {
    if (!supplierItemId) return '';
    const numId = typeof supplierItemId === 'string' ? parseInt(supplierItemId) : supplierItemId;
    const item = this.supplierItems.find(si => si.id === numId);
    return item ? item.name : '';
  }

  /**
   * Cancela la edición de la nota de entrega
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
   * Trigger the submit of the form
   */
  triggerSubmit(): void {
    this.formComponent?.onSubmit();
  }

  /**
   * Load the delivery note
   */
  private loadDeliveryNote(): void {
    if (!this.deliveryNoteId) {
      this.showAlert('error', 'Error', 'No se pudo identificar la nota de entrega.');
      this.loading = false;
      return;
    }

    this.goodsReceiptsService.getById(this.deliveryNoteId).subscribe({
      next: (note: ResponseDeliveryNoteDTO) => {
        this.initialValue = this.mapResponseToForm(note);

        // Cargar supplierItems desde los detalles del delivery note
        this.supplierItems = (note.details || []).map(detail => ({
          id: detail.supplierItemId,
          name: detail.supplierItemName || detail.supplyName || `Item #${detail.supplierItemId}`,
          description: detail.supplierItemName || detail.supplyName || '',
          batchId: detail.batchId
        }));

        // Mapear detalles con valores originales del lote
        this.details = (note.details || []).map(detail => {
          // Obtener el batchNumber del detalle o del objeto batch anidado
          const batchNumber = detail.batchNumber || detail.batch?.batchNumber;
          const expirationDate = detail.expirationDate || detail.batch?.expirationDate;
          // Las notas del batch vienen en el campo notes del detalle según el DTO
          const batchNotes = detail.notes;

          return {
            supplierItemId: detail.supplierItemId,
            requestedQuantity: detail.requestedQuantity ?? detail.quantityOrdered ?? 0,
            receivedQuantity: detail.receivedQuantity ?? detail.quantityReceived ?? 0,
            batchId: detail.batchId,
            detailId: detail.id,
            supplierItemName: detail.supplierItemName || detail.supplyName || 'Item',
            batchNumber: batchNumber,
            expirationDate: expirationDate,
            notes: batchNotes,
            // Guardar valores originales para detectar cambios
            originalBatchId: detail.batchId,
            originalBatchNumber: batchNumber,
            originalExpirationDate: expirationDate,
            originalBatchNotes: batchNotes
          };
        });

        this.resolveSupplierOption(note);

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.showAlert('error', 'Error', 'No se pudo cargar la nota de entrega seleccionada.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map the response to the form data
   * @param note - The response delivery note
   * @returns The form data
   */
  private mapResponseToForm(note: ResponseDeliveryNoteDTO): DeliveryNoteFormData {
    const receiptDate = note.receivedDate || note.receiptDate;
    const rawSupplierId = note.supplier?.id ?? note.supplierId;
    const supplierId = rawSupplierId != null ? Number(rawSupplierId) : undefined;
    const purchaseOrderId = Number(note.purchaseOrderId ?? 0);

    return {
      purchaseOrderId,
      supplierId,
      status: note.status || DeliveryNoteStatus.PENDING,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      notes: note.observations || ''
    };
  }

  /**
   * Load the purchase orders
   */
  private loadPurchaseOrders(): void {
    this.purchaseOrdersService.search({ page: 0, size: 100, isActive: true }).subscribe({
      next: (response: any) => {
        const purchaseOrders = response.content || [];
        const options = purchaseOrders.map((po: any): GenericSelectOption => ({
          label: `${po.number} - ${po.description}`,
          value: po.id
        }));
        this.updateFormFieldOptions('purchaseOrderId', options);
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar las órdenes de compra.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load the supplier items
   */
  private loadSupplierItems(): void {
    // TODO: Implementar carga de items del proveedor desde el servicio correspondiente
    // Por ahora, los items se cargarán desde el delivery note
  }

  /**
   * Update the form field options
   * @param fieldName - The field name
   * @param options - The options
   */
  private updateFormFieldOptions(fieldName: string, options: GenericSelectOption[]): void {
    const field = this.formFields.find(f => f.name === fieldName);
    if (field) {
      field.options = options;
      this.formFields = [...this.formFields];
    }
  }

  /**
   * Format the date for the backend
   * @param value - The value
   * @returns The formatted date
   */
  private formatDateForBackend(value: any): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Handle the http error
   * @param error - The error
   */
  private handleHttpError(error: any): void {
    let errorMessage: string;

    if (error.status === 400) {
      errorMessage = error.error?.message || 'Los datos ingresados no son válidos.';
    } else if (error.status === 403) {
      errorMessage = 'No tiene permisos suficientes para realizar esta operación.';
    } else if (error.status === 409) {
      errorMessage = error.error?.message || 'Conflicto con los datos existentes.';
    } else if (error.status === 404) {
      errorMessage = 'La nota de entrega seleccionada no existe.';
    } else if (error.status === 500) {
      errorMessage = 'Ocurrió un error técnico en el servidor.';
    } else {
      errorMessage = 'No se pudo completar la operación. Verifique su conexión.';
    }

    this.showAlert('error', 'Error', errorMessage);
  }

  /**
   * Show the alert
   * @param type - The type of the alert
   * @param title - The title of the alert
   * @param text - The text of the alert
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.alertType = null;
      this.cdr.markForCheck();
    }, 5000);
  }


  /**
   * Resolve the supplier option
   * @param note - The response delivery note
   */
  private resolveSupplierOption(note: ResponseDeliveryNoteDTO): void {
    const supplierName = note.supplierName?.trim() || note.supplier?.companyName?.trim() || '';
    const rawSupplierId = note.supplier?.id ?? note.supplierId;

    if (rawSupplierId != null) {
      const supplierId = Number(rawSupplierId);
      const label = supplierName || `Proveedor #${supplierId}`;
      this.setSupplierOption(label, supplierId);
      return;
    }

    if (!supplierName) {
      return;
    }

    this.suppliersService.getActiveSuppliers().subscribe({
      next: (suppliers) => {
        const match = suppliers.find((supplier) => supplier.companyName?.trim().toLowerCase() === supplierName.toLowerCase());
        if (match) {
          this.setSupplierOption(match.companyName, match.id);
        } else {
          this.setSupplierOption(supplierName, supplierName);
        }
      },
      error: () => {
        this.setSupplierOption(supplierName, supplierName);
      }
    });
  }

  /**
   * Set the supplier option
   * @param label - The label
   * @param value - The value
   */
  private setSupplierOption(label: string, value: number | string): void {
    this.updateFormFieldOptions('supplierId', [{ label, value }]);
    this.patchSupplierValue(value);
  }

  /**
   * Patch the supplier value
   * @param value - The value
   */
  private patchSupplierValue(value: number | string): void {
    queueMicrotask(() => {
      const control = this.formComponent?.form?.get('supplierId');
      control?.setValue(value, { emitEvent: false });
      if (this.initialValue) {
        this.initialValue = { ...this.initialValue, supplierId: value };
      }
      this.cdr.markForCheck();
    });
  }
}
