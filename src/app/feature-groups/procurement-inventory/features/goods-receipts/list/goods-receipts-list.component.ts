import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject, viewChild, ViewChild, TemplateRef, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from 'src/app/shared/services/export';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import {
  ConfirmationModalComponent
} from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig } from '../../../../../shared/models/generic-tutorial';
import { TutorialService } from '../../../../../shared/services/tutorial.service';
import { ResponseDeliveryNoteDetailDTO } from '../../../models/goods-receipt-details/goods-receipt-details.models';
import {
  DeliveryNoteFiltersDTO, DeliveryNoteStatus, DeliveryNoteType,
  ResponseDeliveryNoteDTO
} from '../../../models/goods-receipts/goods-receipts.models';
import { GoodsReceiptsService } from '../../../services/goods-receipts/goods-receipts.service';
import { PageResponse } from '../../../shared/utils/pagination';

import {
  GOODS_RECEIPT_EXPORT_COLUMNS,
  GOODS_RECEIPT_PDF_COLUMNS
} from './goods-receipts-export-config';

/**
 * Enum for receipt types
 */
enum ReceiptType {
  EXTERNAL = 'PURCHASE',
  INTERNAL = 'TRANSFER'
}

/**
 * Component to list delivery notes (goods receipts)
 */
@Component({
  selector: 'app-goods-receipts-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    InputNumberModule,
    GenericTableComponent,
    ConfirmationModalComponent,
    GenericAlertComponent,
    TableModule,
    TutorialOverlayComponent,
    TabsModule
  ],
  templateUrl: './goods-receipts-list.component.html',
  styleUrls: ['./goods-receipts-list.component.css'],
  providers: [DatePipe]
})
export class GoodsReceiptsListComponent implements OnInit, OnDestroy {
  private readonly goodsReceiptsService = inject(GoodsReceiptsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly datePipe = inject(DatePipe);
  private readonly tutorialService = inject(TutorialService);
  private readonly authService = inject(AuthService);

  // Tutorial
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;
  private tutorialSub?: Subscription;

  // Tutorial configuration that changes dynamically based on selected receipt type
  tutorialConfig = computed<TutorialConfig>(() => {
    const receiptType = this.selectedReceiptType();
    const isExternal = receiptType === ReceiptType.EXTERNAL;

    // Dynamic content based on receipt type
    const movementTypeMessage = isExternal
      ? 'Actualmente estás en el modo de Recepción Externa (de proveedores). Registra remitos de compras a proveedores externos.'
      : 'Actualmente estás en el modo de Recepción Interna (transferencias). Registra recepciones de transferencias entre ubicaciones internas.';

    return {
      steps: [
        {
          target: '.movement-type-selector-container',
          title: 'Tipos de recepción',
          message: movementTypeMessage,
          position: 'bottom',
          highlightPadding: 8
        },
        {
          target: 'app-generic-table:table-intro',
          title: 'Remitos de entrega',
          message: 'Aquí se registran todos los remitos de recepción de mercadería. Puedes ver el proveedor, fecha de recepción y estado de cada remito.',
          position: 'top'
        },
        {
          target: 'app-generic-table button:has(.pi-filter)',
          title: 'Filtros de búsqueda',
          message: 'Utiliza los filtros para buscar remitos por estado (Pendiente, Recibida, Devuelta, Cancelada).',
          position: 'bottom'
        },
        {
          target: 'app-generic-table .search-box',
          title: 'Búsqueda rápida',
          message: 'Utiliza la barra de búsqueda para encontrar remitos de forma rápida.',
          position: 'bottom',
          highlightPadding: 8
        },
        {
          target: '.download-menu-container button',
          title: 'Exportar datos',
          message: 'Exporta el listado de remitos a Excel o PDF para análisis, auditorías o reportes de recepción.',
          position: 'bottom'
        },
        {
          target: 'app-generic-table button:has(.pi-plus)',
          title: 'Registrar remito',
          message: 'Haz clic aquí para registrar un nuevo remito de entrega. Podrás asociarlo a una orden de compra o crearlo de forma independiente.',
          position: 'left'
        },
        {
          target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
          title: 'Menú de acciones',
          message: 'Haz clic en este botón para ver las acciones disponibles para cada remito.',
          position: 'left',
          highlightPadding: 4
        },
        {
          target: '.p-popover-content',
          title: 'Acciones disponibles',
          message: 'Desde el menú de acciones puedes ver detalles, editar y desactivar remitos.',
          position: 'left',
          onEnter: () => {
            // Auto-open the actions menu in this step
            if (!document.querySelector('.p-popover-content')) {
              const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
              if (firstMenuButton) {
                firstMenuButton.click();
              }
            }
          }
        }
      ],
      onComplete: () => {
        // Close the actions popover if it's open
        if (document.querySelector('.p-popover-content')) {
          document.body.click();
        }

        this.showAlertMessage('Tutorial completado! Ya conoces todas las funcionalidades de gestión de remitos.', 'success');
      },
      onSkip: () => {
        // Tutorial skipped by user
      }
    };
  });

  // Expose enum to template
  ReceiptType = ReceiptType;

  // Signal for selected receipt type
  selectedReceiptType = signal<ReceiptType>(ReceiptType.EXTERNAL);

  // Options for receipt type selector
  receiptTypeOptions = [
    {
      value: ReceiptType.EXTERNAL,
      label: 'Externo',
      icon: 'pi pi-truck'
    },
    {
      value: ReceiptType.INTERNAL,
      label: 'Interno',
      icon: 'pi pi-building'
    }
  ];

  // Signals para alertas
  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning' | 'info'>('success');
  alertTitle = signal('');
  alertText = signal('');

  // Template reference for expanded content
  expandedRowTemplate = viewChild<TemplateRef<any>>('expandedTpl');

  // Data
  deliveryNotes: ResponseDeliveryNoteDTO[] = [];
  totalRecords = 0;
  loading = false;

  // Pagination
  first = 0;
  rows = 10;

  // Search term for global filter
  searchTerm = '';

  // Filters
  filters: DeliveryNoteFiltersDTO = {
    page: 0,
    size: 10,
    isActive: true,
    exitType: ReceiptType.EXTERNAL,
    sort: 'delivery_note_number,desc'
  };

  // Generic filters configuration - following purchase orders pattern
  genericFilters: Filter[] = [
    {
      id: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { label: 'PENDIENTE', value: 'PENDING' },
        { label: 'RECIBIDA', value: 'RECEIVED' },
        { label: 'DEVUELTA', value: 'RETURNED' },
        { label: 'CANCELADA', value: 'CANCELLED' }
      ]
    }
  ];

  // Table columns for generic table
  columns = [
    { field: 'deliveryNoteNumber', header: 'Remito', sortable: true },
    { field: 'receivedDate', header: 'Fecha', sortable: true },
    { field: 'supplierName', header: 'Proveedor', sortable: true },
    { field: 'statusText', header: 'Estado', sortable: false }
  ];

  // Columns for external receipts (PURCHASE)
  private externalColumns = [
    { field: 'deliveryNoteNumber', header: 'Remito', sortable: true },
    { field: 'receivedDate', header: 'Fecha', sortable: true },
    { field: 'supplierName', header: 'Proveedor', sortable: true },
    { field: 'statusText', header: 'Estado', sortable: false }
  ];

  // Columns for internal receipts (TRANSFER)
  private internalColumns = [
    { field: 'deliveryNoteNumber', header: 'Remito', sortable: true },
    { field: 'receivedDate', header: 'Fecha', sortable: true },
    { field: 'statusText', header: 'Estado', sortable: false }
  ];

  /**
   * Column definitions for the details table inside the expanded row
   */
  detailColumns = [
    { field: 'productName', header: 'Producto', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true, textAlign: 'right' },
    { field: 'batchNumber', header: 'Lote', sortable: true },
    { field: 'expirationDate', header: 'Vencimiento', sortable: true }
  ];

  // Modales para transferencias (MD)
  showReceiveConfirmModal = false;
  itemToReceive: ResponseDeliveryNoteDTO | null = null;

  showCancelConfirmModal = false;
  itemToCancel: ResponseDeliveryNoteDTO | null = null;

  showConfirmTransferModal = false;
  itemToConfirm: ResponseDeliveryNoteDTO | null = null;

  // Selection tracking
  selectedDetails: Map<number, ResponseDeliveryNoteDetailDTO[]> = new Map();

  // Return mode tracking - controls which delivery note has return mode active
  private returnModeActiveRows: Set<number> = new Set();

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Recepción de mercadería',
      '/procurement-inventory/goods-receipts'
    );

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('goods-receipts')) return;

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });

    this.loadDeliveryNotes();
  }


  /**
   * Loads the delivery notes from the service
   */
  loadDeliveryNotes(): void {
    this.loading = true;
    this.goodsReceiptsService.search(this.filters).subscribe({
      next: (response: PageResponse<ResponseDeliveryNoteDTO>) => {
        // Map legacy fields to new fields for compatibility and add badge data.
        this.deliveryNotes = response.content.map(dn => {
          // Determine date based on receipt type
          const dateToShow = this.selectedReceiptType() === ReceiptType.INTERNAL
            ? (dn.createdDateTime || dn.receivedDate || dn.receiptDate)
            : (dn.receivedDate || dn.receiptDate);

          return {
            ...dn,
            // Use delivery_note_number from backend, fallback to legacy receiptNumber if not available
            deliveryNoteNumber: dn.deliveryNoteNumber || 'N/A',
            supplierName: dn.supplier?.companyName || dn.supplierName || 'N/A',
            receivedDate: this.datePipe.transform(dateToShow, 'dd/MM/yyyy') || '',
            details: dn.details || [],
            // Map status to statusText for GenericTableComponent badge rendering
            statusText: this.getStatusLabel(dn.status).toUpperCase(),
            // Map status to badge format (MIN, COMPLETE, VERIFIED) for GenericTableComponent
            status: this.mapStatusForBadge(dn.status),
            // Keep original status from backend for logic
            originalStatus: dn.status
          };
        });
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Handles the page change
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.first = event.first;
    this.rows = event.rows;
    this.filters.page = Math.floor(event.first / event.rows);
    this.filters.size = event.rows;
    this.loadDeliveryNotes();
  }

  /**
   * Handle sorting changes
   * @param sortData - Array with sorting information
   */
  onSortChange(sortData: { field: string; order: 'asc' | 'desc' }[]): void {
    if (!sortData || sortData.length === 0) {
      return;
    }

    const sort = sortData[0];
    if (!sort || !sort.field) {
      return;
    }

    // Map display fields to backend fields
    let backendField = sort.field;

    // Mapping of transformed fields to backend fields
    if (sort.field === 'receivedDate') {
      backendField = 'receiptDate';
    } else if (sort.field === 'delivery_note_number') {
      backendField = 'delivery_note_number';
    } else if (sort.field === 'supplierName') {
      backendField = 'supplierName';
    }

    // Format expected by Spring: "field,direction"
    const sortDirection = sort.order === 'asc' ? 'asc' : 'desc';
    this.filters.sort = `${backendField},${sortDirection}`;

    // Reset to first page when changing sorting
    this.filters.page = 0;
    this.first = 0;
    this.loadDeliveryNotes();
  }

  /**
   * Handles the click on the create button
   */
  onCreate(): void {
    this.alertTitle.set('Aviso');
    this.alertText.set('Para generar remitos, debe dirigirse a la sección de Órdenes de Compra y desde allí generar los remitos correspondientes.');
    this.alertType.set('info');
    this.showAlert.set(true);

    // Hide alert after 5 seconds
    setTimeout(() => this.showAlert.set(false), 5000);
  }

  /**
   * Returns the actions available for each row (following MD logic)
   * Actions depend on the delivery note's type (PURCHASE/TRANSFER) and status
   */
  getActions = (row: ResponseDeliveryNoteDTO) => {
    const actions: any[] = [];
    const type = row.type || this.selectedReceiptType();
    const status = row.originalStatus || row.status;

    // ACCIONES PARA REMITOS EXTERNOS (PURCHASE/COMPRAS)
    if (type === DeliveryNoteType.PURCHASE || type === ReceiptType.EXTERNAL) {
      // Solo se puede EDITAR si está PENDING
      if (status === DeliveryNoteStatus.PENDING || status === 'PENDING') {
        actions.push(
          {
            id: 'edit',
            label: 'Editar',
            icon: 'pi pi-pencil',
            command: () => this.router.navigate(['/procurement-inventory/goods-receipts', row.id, 'edit'])
          }
        );
      }
    }

    // ACCIONES PARA REMITOS INTERNOS (TRANSFER/TRANSFERENCIAS)
    if (type === DeliveryNoteType.TRANSFER || type === ReceiptType.INTERNAL) {
      // Solo se puede RECIBIR o CANCELAR si está PENDING
      if (status === DeliveryNoteStatus.PENDING || status === 'PENDING') {
        actions.push(
          {
            id: 'receive',
            label: 'Confirmar transferencia',
            icon: 'pi pi-check-circle',
            command: () => this.onConfirmTransferModal(row)
          },
          {
            id: 'cancel',
            label: 'Cancelar transferencia',
            icon: 'pi pi-times',
            command: () => this.onCancelTransfer(row)
          }
        );
      }
    }

    return actions;
  };

  /**
   * Wrapper for getActions to be used in the template
   * Returns actions only for internal receipts, empty array for external
   */
  getActionsForTable = (row: ResponseDeliveryNoteDTO) => {
    if (this.selectedReceiptType() === ReceiptType.INTERNAL) {
      return this.getActions(row);
    }
    return [];
  };

  /**
   * Handles the return of a specific product (DEPRECATED - usar onReturnMerchandise)
   */
  onReturnProduct(row: ResponseDeliveryNoteDTO, detail: ResponseDeliveryNoteDetailDTO): void {
    const queryParams = {
      detailId: detail.id,
      supplierName: row.supplierName || row.supplier?.companyName || '',
      productName: detail.supplierItemName || detail.supplyName || '',
      batchNumber: detail.batchNumber || '',
      batchExpirationDate: detail.expirationDate || '',
      quantity: detail.receivedQuantity || detail.quantityReceived || 0,
      type : row.purchaseOrderId==null ? 'TRANSFER' : 'RETURN'
    };

    this.router.navigate(
      ['/procurement-inventory/goods-receipts', row.id, 'return'],
      { queryParams }
    );
  }

  /**
   * Handles merchandise return to supplier (MD: POST /delivery-notes/{id}/return)
   * Solo para remitos EXTERNOS en estado RECEIVED
   * Precarga formulario de movimiento de stock tipo EXIT (devolución a proveedor)
   */
  onReturnMerchandise(row: ResponseDeliveryNoteDTO): void {
    // Navegar a create-return con el ID del remito
    // El componente create-return se encarga de precargar los datos
    this.router.navigate(['/procurement-inventory/goods-receipts', row.id, 'return']);
  }

  /**
   * Cancela la confirmación de recepción
   */
  onCancelReceiveTransfer(): void {
    this.showReceiveConfirmModal = false;
    this.itemToReceive = null;
  }

  /**
   * Handles transfer cancellation (MD: POST /delivery-notes/{id}/cancel)
   * Solo para remitos INTERNOS en estado PENDING
   * Muestra modal para ingresar motivo de cancelación (opcional)
   */
  onCancelTransfer(row: ResponseDeliveryNoteDTO): void {
    this.itemToCancel = row;
    this.showCancelConfirmModal = true;
  }

  /**
   * Confirma la cancelación de transferencia
   */
  onConfirmCancelTransfer(): void {
    if (!this.itemToCancel) return;

    const currentUser = this.authService.getUser();

    this.loading = true;
    this.goodsReceiptsService.cancelTransfer(this.itemToCancel.id, currentUser?.id || 0).subscribe({
      next: () => {
        this.showAlertMessage('Transferencia cancelada exitosamente', 'success');
        this.showCancelConfirmModal = false;
        this.itemToCancel = null;
        this.loadDeliveryNotes();
      },
      error: (error) => {
        this.showAlertMessage(error?.error?.message || 'Error al cancelar la transferencia', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancela el modal de cancelación de transferencia
   */
  onDismissCancelTransfer(): void {
    this.showCancelConfirmModal = false;
    this.itemToCancel = null;
  }

  /**
   * Handles transfer confirmation (MD: POST /delivery-notes/{id}/confirm)
   * Solo para remitos INTERNOS en estado RECEIVED
   * Muestra modal para ingresar notas opcionales
   */
  onConfirmTransferModal(row: ResponseDeliveryNoteDTO): void {
    this.itemToConfirm = row;
    this.showConfirmTransferModal = true;
  }

  /**
   * Confirma la confirmación de transferencia
   */
  onConfirmTransfer(): void {
    if (!this.itemToConfirm) return;

    const currentUser = this.authService.getUser();

    this.loading = true;
    this.goodsReceiptsService.confirmTransfer(this.itemToConfirm.id, currentUser?.id || 0).subscribe({
      next: () => {
        this.showAlertMessage('Transferencia confirmada exitosamente', 'success');
        this.showConfirmTransferModal = false;
        this.itemToConfirm = null;
        this.loadDeliveryNotes();
      },
      error: (error) => {
        this.showAlertMessage(error?.error?.message || 'Error al confirmar la transferencia', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancela el modal de confirmación de transferencia
   */
  onDismissConfirmTransfer(): void {
    this.showConfirmTransferModal = false;
    this.itemToConfirm = null;
  }

  /**
   * Handles the changes in the filters
   */
  onFilterChange(event: FilterChangeEvent): void {
    // Reset optional filters
    this.filters.status = undefined;

    // Apply each filter from event
    event.filters.forEach(filter => {
      switch (filter.id) {
      case 'status':
        this.filters.status = filter.value as string || undefined;
        break;
      }
    });

    this.filters.page = 0;
    this.first = 0;

    // Reload with new filters
    this.loadDeliveryNotes();
  }

  /**
   * Handles global filter (search) changes
   * @param searchTerm - The search term entered by the user
   */
  onGlobalFilter(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.filters.searchTerm = searchTerm.trim() || undefined;

    this.filters.page = 0;
    this.first = 0;

    this.loadDeliveryNotes();
  }

  /**
   * Clears the applied filters
   */
  clearFilters(): void {
    this.filters = {
      page: 0,
      size: 10,
      sort: 'delivery_note_number,desc',
      isActive: true,
      exitType: ReceiptType.EXTERNAL
    };
    this.first = 0;
    this.loadDeliveryNotes();
  }
  /**
   * Export current delivery notes page to Excel using generic export service.
   * @param filteredData - Filtered data from table
   */
  async onExportExcelGeneric(filteredData: any[]): Promise<void> {
    const dataToExport = filteredData;

    if (!dataToExport.length) {
      this.showAlertMessage('No hay datos para exportar con los filtros aplicados.', 'warning');
      return;
    }

    try {
      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: GOODS_RECEIPT_EXPORT_COLUMNS,
        fileName: 'remitos',
        sheetName: 'Remitos',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlertMessage('Remitos exportados correctamente.', 'success');
      } else {
        this.showAlertMessage(result.error || 'No se pudo generar el archivo de exportación.', 'error');
      }
    } catch {
      this.showAlertMessage('No se pudo generar el archivo de exportación.', 'error');
    }
  }

  /**
   * Export current delivery notes page to PDF using generic export service.
   * @param filteredData - Filtered data from table
   */
  async onExportPdfGeneric(filteredData: any[]): Promise<void> {
    const dataToExport = filteredData;

    if (!dataToExport.length) {
      this.showAlertMessage('No hay datos para exportar con los filtros aplicados.', 'warning');
      return;
    }

    try {
      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: GOODS_RECEIPT_PDF_COLUMNS,
        fileName: 'remitos',
        title: 'Listado de Remitos',
        orientation: 'landscape',
        includeDate: true,
        includeTimestamp: true,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 230,
          y: 8
        }
      });

      if (result.success) {
        this.showAlertMessage('Remitos exportados correctamente.', 'success');
      } else {
        this.showAlertMessage(result.error || 'No se pudo generar el archivo de exportación.', 'error');
      }
    } catch {
      this.showAlertMessage('No se pudo generar el archivo de exportación.', 'error');
    }
  }

  /**
   * Gets the details to display in the expanded row
   */
  getDetails(row: ResponseDeliveryNoteDTO): ResponseDeliveryNoteDetailDTO[] {
    return row.details || [];
  }

  /**
   * Gets the transformed details for display in the generic table
   * @param row - The delivery note row
   * @returns Array of details with fields matching the column definitions
   */
  getDetailsForTable(row: ResponseDeliveryNoteDTO): any[] {
    const details = this.getDetails(row);
    const isInternal = this.selectedReceiptType() === ReceiptType.INTERNAL;

    return details.map(detail => ({
      id: detail.id,
      productName: isInternal
        ? (detail.supply?.name || detail.supplyName || 'N/A')
        : (detail.supplierItemName || detail.productName || detail.supplyName || 'N/A'),
      quantity: isInternal
        ? (detail.requestedQuantity || 0)
        : (detail.receivedQuantity || detail.quantityReceived || 0),
      batchNumber: detail.batchNumber || 'N/A',
      expirationDate: detail.expirationDate || 'N/A',
      // Keep original detail for selection purposes
      _original: detail
    }));
  }

  /**
   * Maps the status to a badge type
   */
  mapStatusForBadge(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'COMPLETE',
      'RECEIVED': 'VERIFIED',
      'RETURNED': 'MIN',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[status] || 'MIN';
  }

  /**
   * Shows an alert message
   * @param text - The text of the alert
   * @param type - The type of the alert ('success', 'error', 'warning' | 'info')
   */
  showAlertMessage(text: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.alertText.set(text);
    this.alertType.set(type);
    this.showAlert.set(true);

    // Hide alert after 3 seconds
    setTimeout(() => this.showAlert.set(false), 3000);
  }

  /**
   * Handles the change of the receipt type
   */
  onReceiptTypeChange(): void {
    // Clear selected details when changing receipt type
    this.selectedDetails.clear();
    this.returnModeActiveRows.clear();

    // Update filters and reload data
    this.filters.exitType = this.selectedReceiptType();
    this.clearFilters();
  }

  /**
   * Gets the status label for a specific status
   */
  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'PENDING': 'Pendiente',
      'RECEIVED': 'Recibido',
      'RETURNED': 'Devuelto',
      'CANCELLED': 'Cancelada',
      'PARTIAL':'Devolución Parcial'
    };
    return statusLabels[status] || status;
  }


  /**
   * Handles the receipt type tab change
   */
  onTabChange(type: ReceiptType): void {
    this.selectedReceiptType.set(type);
    this.filters.exitType = type;

    // Update columns based on receipt type
    if (type === ReceiptType.INTERNAL) {
      this.columns = this.internalColumns;
    } else {
      this.columns = this.externalColumns;
    }

    this.filters.page = 0;
    this.first = 0;

    this.loadDeliveryNotes();
    this.cdr.markForCheck();
  }

  /**
   * TrackBy function for details list optimization
   */
  trackByDetailId(_index: number, detail: any): number {
    return detail.id;
  }

  /**
   * Checks if a detail is selected
   */
  isDetailSelected(deliveryNoteId: number, detailId: number): boolean {
    const selectedForNote = this.selectedDetails.get(deliveryNoteId);
    return selectedForNote?.some(d => d.id === detailId) ?? false;
  }

  /**
   * Toggles selection of a specific detail
   */
  onDetailSelectionChange(deliveryNote: ResponseDeliveryNoteDTO, detail: ResponseDeliveryNoteDetailDTO, selected: boolean): void {
    const noteId = deliveryNote.id;

    if (!this.selectedDetails.has(noteId)) {
      this.selectedDetails.set(noteId, []);
    }

    const selectedForNote = this.selectedDetails.get(noteId)!;

    if (selected) {
      if (!selectedForNote.some(d => d.id === detail.id)) {
        selectedForNote.push({
          ...detail,
          deliveryNoteId: deliveryNote.id
        });
      }
    } else {
      const index = selectedForNote.findIndex(d => d.id === detail.id);
      if (index !== -1) {
        selectedForNote.splice(index, 1);
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Checks if all details are selected for a delivery note
   */
  areAllDetailsSelected(deliveryNote: ResponseDeliveryNoteDTO): boolean {
    const details = this.getDetails(deliveryNote);
    if (details.length === 0) return false;

    const selectedForNote = this.selectedDetails.get(deliveryNote.id);
    if (!selectedForNote || selectedForNote.length === 0) return false;
    return details.every(detail => selectedForNote.some(d => d.id === detail.id));
  }

  /**
   * Toggles selection of all details for a delivery note
   */
  onSelectAllDetails(deliveryNote: ResponseDeliveryNoteDTO, selected: boolean): void {
    const details = this.getDetails(deliveryNote);

    details.forEach(detail => {
      this.onDetailSelectionChange(deliveryNote, detail, selected);
    });

    this.cdr.markForCheck();
  }

  /**
   * Gets the count of selected details for a specific row
   */
  getSelectedCountForRow(deliveryNoteId: number): number {
    const selectedForNote = this.selectedDetails.get(deliveryNoteId);
    return selectedForNote?.length ?? 0;
  }

  /**
   * Checks if return mode is active for a specific row
   */
  isReturnModeActive(deliveryNoteId: number): boolean {
    return this.returnModeActiveRows.has(deliveryNoteId);
  }

  /**
   * Activates return mode for a specific row
   */
  activateReturnMode(deliveryNoteId: number): void {
    this.returnModeActiveRows.add(deliveryNoteId);
    this.cdr.markForCheck();
  }

  /**
   * Deactivates return mode for a specific row and clears its selections
   */
  deactivateReturnMode(deliveryNoteId: number): void {
    this.returnModeActiveRows.delete(deliveryNoteId);
    this.selectedDetails.delete(deliveryNoteId);
    this.cdr.markForCheck();
  }

  /**
   * Gets the total count of selected details across all delivery notes
   */
  getTotalSelectedCount(): number {
    let count = 0;
    this.selectedDetails.forEach(details => {
      count += details.length;
    });
    return count;
  }

  /**
   * Navigates to stock movement creation with selected details
   */
  onCreateReturnMovement(): void {
    const totalSelected = this.getTotalSelectedCount();

    if (totalSelected === 0) {
      this.showAlertMessage('Por favor seleccione al menos un producto para devolver', 'warning');
      return;
    }

    // Flatten all selected details
    const allSelectedDetails: ResponseDeliveryNoteDetailDTO[] = [];
    this.selectedDetails.forEach(details => {
      allSelectedDetails.push(...details);
    });

    // Obtener el primer remito asociado a los detalles seleccionados
    // (Asumimos que todos los detalles pertenecen al mismo remito/proveedor)
    const firstEntry = this.selectedDetails.entries().next();
    let deliveryNoteForReturn: ResponseDeliveryNoteDTO | undefined;

    if (!firstEntry.done) {
      const firstDeliveryNoteId = firstEntry.value[0];
      deliveryNoteForReturn = this.deliveryNotes.find(dn => dn.id === firstDeliveryNoteId);
    }

    // Map details to preloaded format
    const preloadedDetails = allSelectedDetails.map(detail => {
      const expirationDate = this.formatDateISO(detail.expirationDate);

      // Determinar si es remito externo (PURCHASE) o interno (TRANSFER)
      // Si tiene purchaseOrderId es externo (compra), sino es interno (transferencia)
      const isExternal = deliveryNoteForReturn?.purchaseOrderId !== undefined && deliveryNoteForReturn?.purchaseOrderId !== null;

      // Para remitos externos usar supplierItemName, para internos usar supply.name
      const productName = isExternal
        ? detail.supplierItemName
        : (detail.supply?.name || detail.supplyName);

      const supplyId = detail.supply?.id || detail.supplyId;

      return {
        supply_id: supplyId ? Number(supplyId) : null,
        supply_name: productName,
        quantity: detail.receivedQuantity || 0,
        batch_number: detail.batchNumber || '',
        batch_id: detail.batchId,
        expiration_date: expirationDate,
        notes: 'Devolución de nota de entrega',
        delivery_note_id: detail.deliveryNoteId,
        detail_id: detail.id,
        supplier_item_id: detail.supplierItemId,
        supplier_item_name: detail.supplierItemName
      };
    });

    // Navigate with state containing the selected details and metadata
    this.router.navigate(
      ['/procurement-inventory/stock-movements'],
      {
        queryParams: { type: 'RETURN' },
        state: {
          fromGoodReceipts: true,
          preloadedDetails,
          supplierId: deliveryNoteForReturn?.supplierId ?? deliveryNoteForReturn?.supplier?.id,
          supplierName: deliveryNoteForReturn?.supplierName || deliveryNoteForReturn?.supplier?.companyName || '',
          originLocationName: deliveryNoteForReturn?.originLocation || '',
          exitReason: 'SUPPLIER_RETURN',
          id: deliveryNoteForReturn?.id,
          reason: `Devolución de remito ${deliveryNoteForReturn?.deliveryNoteNumber || deliveryNoteForReturn?.receiptNumber || ''}`,
          metadata: {
            type: deliveryNoteForReturn?.purchaseOrderId ? 'RETURN' : 'TRANSFER'
          }
        }
      }
    );
  }

  /**
   * Formats a date to ISO format (YYYY-MM-DD)
   */
  private formatDateISO(date: any): string {
    if (!date) return '';

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return '';

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  /**
   * Clears all selections
   */
  clearSelections(): void {
    this.selectedDetails.clear();
    this.cdr.markForCheck();
  }
  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }
}
