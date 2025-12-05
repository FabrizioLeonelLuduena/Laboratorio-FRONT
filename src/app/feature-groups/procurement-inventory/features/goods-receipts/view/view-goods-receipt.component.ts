import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { ResponseDeliveryNoteDetailDTO } from '../../../models/goods-receipt-details/goods-receipt-details.models';
import { DELIVERY_NOTE_STATUS_LABELS, DeliveryNoteStatus, ResponseDeliveryNoteDTO } from '../../../models/goods-receipts/goods-receipts.models';
import { GoodsReceiptsService } from '../../../services/goods-receipts/goods-receipts.service';

const GRID_COLUMNS = 2;

/**
 * View goods receipt component
 */
@Component({
  selector: 'app-view-goods-receipt',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent,
    PanelModule,
    TableModule
  ],
  templateUrl: './view-goods-receipt.component.html',
  styleUrl: './view-goods-receipt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewGoodsReceiptComponent implements OnInit {
  private goodsReceiptsService = inject(GoodsReceiptsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  readonly gridColumns = GRID_COLUMNS;

  formFields: GenericFormField[] = [
    {
      name: 'deliveryNoteNumber',
      label: 'Nota de Entrega',
      type: 'text',
      disabled: true,
      colSpan: 1
    },
    {
      name: 'statusLabel',
      label: 'Estado',
      type: 'text',
      disabled: true,
      colSpan: 1
    },
    {
      name: 'receiptDate',
      label: 'Fecha de Recepción',
      type: 'date',
      disabled: true,
      colSpan: 1
    },
    {
      name: 'supplierName',
      label: 'Proveedor',
      type: 'text',
      disabled: true,
      colSpan: 1
    },
    {
      name: 'purchaseOrder',
      label: 'Orden de Compra',
      type: 'text',
      disabled: true,
      colSpan: 1
    },
    {
      name: 'notes',
      label: 'Observaciones',
      type: 'textarea',
      disabled: true,
      rows: 3,
      colSpan: GRID_COLUMNS
    }
  ];

  initialValue: Record<string, any> | null = null;
  details: Array<ResponseDeliveryNoteDetailDTO> = [];

  loading = true;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  private deliveryNoteId!: number;

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    this.deliveryNoteId = Number(this.route.snapshot.paramMap.get('id'));
    this.breadcrumbService.setFromString(
      'Compras e inventario > Recepción de mercadería > Ver',
      '/procurement-inventory/goods-receipts'
    );

    if (!this.deliveryNoteId) {
      this.showAlert('error', 'Error', 'No se pudo identificar la nota de entrega.');
      this.loading = false;
      return;
    }

    this.loadGoodsReceipt();
  }

  /**
   * Cancel the component
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
   * Load the goods receipt
   */
  private loadGoodsReceipt(): void {
    this.goodsReceiptsService.getById(this.deliveryNoteId).subscribe({
      next: (response: ResponseDeliveryNoteDTO) => {
        this.initialValue = this.mapResponseToForm(response);
        this.details = (response.details || []).map(detail => ({
          ...detail,
          supplierItemName: detail.supplierItemName || detail.supplyName || 'Sin descripción'
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar la nota de entrega seleccionada.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map the response to the form
   * @param note - The response delivery note
   * @returns The form data
   */
  private mapResponseToForm(note: ResponseDeliveryNoteDTO): Record<string, any> {
    const receiptDate = note.receivedDate || note.receiptDate || null;
    const purchaseOrderNumber = note.purchaseOrderNumber || note.purchaseOrderId || '';
    const supplierName = note.supplier?.companyName || note.supplierName || '';
    const status = this.getStatusLabel(note.status as DeliveryNoteStatus | string);

    return {
      deliveryNoteNumber: note.id,
      statusLabel: status,
      receiptDate: receiptDate ? new Date(receiptDate) : null,
      supplierName,
      purchaseOrder: purchaseOrderNumber,
      notes: note.observations || '',
      details: (note.details || []).map(detail => ({
        supplierItemId: detail.supplierItemId,
        receivedQuantity: detail.receivedQuantity ?? detail.quantityReceived ?? 0,
        batchNumber: detail.batchNumber || ''
      }))
    };
  }

  /**
   * Get the status label
   * @param status - The status
   * @returns The status label
   */
  private getStatusLabel(status: DeliveryNoteStatus | string | undefined): string {
    if (!status) return 'N/D';
    if (typeof status === 'string') {
      const normalized = status.toUpperCase() as DeliveryNoteStatus;
      return DELIVERY_NOTE_STATUS_LABELS[normalized] || status;
    }
    return DELIVERY_NOTE_STATUS_LABELS[status] || String(status);
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
}
