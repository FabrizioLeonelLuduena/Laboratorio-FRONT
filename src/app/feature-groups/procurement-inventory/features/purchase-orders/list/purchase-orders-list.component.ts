import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject,
  AfterViewInit,
  ViewChild,
  TemplateRef,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PurchaseOrderFiltersDTO, ResponsePurchaseOrderDTO } from '../../../models/purchase-orders/purchase-orders.models';
import { PurchaseOrderDetailsService } from '../../../services/purchase-order-details/purchase-order-details.service';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';

/**
 * Component for listing purchase orders
 */
@Component({
  selector: 'app-purchase-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    GenericBadgeComponent,
    TutorialOverlayComponent
  ],
  templateUrl: './purchase-orders-list.component.html',
  styleUrls: ['./purchase-orders-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersListComponent implements OnInit, OnDestroy, AfterViewInit {
  purchaseOrders: ResponsePurchaseOrderDTO[] = [];
  loading = false;
  totalRecords = 0;

  // Injected services and utilities
  private purchaseOrdersService = inject(PurchaseOrdersService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private authService = inject(AuthService);
  private purchaseOrderDetailsService = inject(PurchaseOrderDetailsService);
  private tutorialService = inject(TutorialService);
  private messageService = inject(MessageService);

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;
  private tutorialSub?: any;

  // Debounced global filter stream
  private globalFilter$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        // Special selector to highlight table header + first data row
        target: 'app-generic-table:table-intro',
        title: 'Órdenes de compra',
        message: 'Aquí puedes gestionar todas las órdenes de compra. Visualiza el estado, proveedor, fecha de creación y monto total de cada orden.',
        position: 'top'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar órdenes por estado (Pendiente, Enviada, Recibida, Cancelada), proveedor o rango de fechas.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar insumos por nombre de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de órdenes de compra a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom',
        onEnter: () => {
          // Close the expanded row that was opened in step 1
          // This leaves the UI clean at the end of the tutorial
          if (this.genericTable && document.querySelector('.p-4.bg-gray-50.border-l-4')) {
            // Get the first row's key and collapse it
            const currentData = this.purchaseOrders;
            if (currentData.length > 0) {
              const firstRow = currentData[0];
              const key = firstRow.id;
              this.genericTable.expandedRowKeys[key] = false;
            }
          }
        }
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nueva orden',
        message: 'Haz clic aquí para crear una nueva orden de compra. Podrás seleccionar el proveedor, agregar insumos y definir cantidades y precios.',
        position: 'left'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada orden de compra.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes ver detalles, editar, cambiar el estado de una orden y cancelarla.',
        position: 'left',
        onEnter: () => {
          // Auto-open the actions menu in this step
          // The popover closes when clicking elsewhere, so we open it here right before highlighting
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
      // Close the actions popover if it's open to leave UI clean
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }

      this.alertMessage = 'Tutorial completado! Ya conoces todas las funcionalidades de gestión de órdenes de compra.';
      this.alertType = 'success';
      this.showAlert = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 3000);
    },
    onSkip: () => {
      // Tutorial skipped by user
    }
  });

  // Flag que indica si el usuario actual puede gestionar OC (OPERADOR_COMPRAS o ADMINISTRADOR)
  canManage = false;

  // Alerts
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  // Cancellation modal
  showCancelConfirmModal = false;
  cancelModalMessage = '';
  orderToCancel: ResponsePurchaseOrderDTO | null = null;

  // Status change confirmation modal
  showStatusChangeModal = false;
  orderToChangeStatus: ResponsePurchaseOrderDTO | null = null;
  targetStatus = '';
  targetStatusLabel = '';

  // Receive confirmation modal
  showReceiveConfirmModal = false;
  orderToReceive: ResponsePurchaseOrderDTO | null = null;

  // Removed deactivation/reactivation properties (always active)

  purchaseOrderFilters: PurchaseOrderFiltersDTO = {
    page: 0,
    size: 10,
    sort: 'orderDate,desc', // Sort by date descending (most recent first)
    isActive: true
  };

  @ViewChild('statusBadgeTemplate') statusBadgeTemplate!: TemplateRef<any>;
  @ViewChild('purchaseOrdersDetailTemplate', { static: true })
    purchaseOrdersDetailTemplate!: TemplateRef<any>;

  // Cache of details by purchaseOrderId
  purchaseOrderDetailsMap: Map<number, any[]> = new Map();
  loadingDetailsMap: Map<number, boolean> = new Map();

  filters: Filter[] = [
    {
      id: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { label: 'PENDIENTE', value: 'PENDING' },
        { label: 'ENVIADA', value: 'SENT' },
        { label: 'RECIBIDA', value: 'RECEIVED' },
        { label: 'CANCELADA', value: 'CANCELLED' }
      ]
    }
  ];

  // Column configuration for GenericTableComponent
  columns: any[] = [];

  /**
   * Column definitions for the details table inside the expanded row
   */
  detailColumns = [
    { field: 'supplierItemDescription', header: 'Ítem proveedor', sortable: true },
    { field: 'uomName', header: 'Unidad de medida', sortable: true },
    { field: 'packagingDescription', header: 'Empaque', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true, textAlign: 'right' },
    {
      field: 'unitPrice',
      header: 'Precio unitario',
      sortable: true,
      textAlign: 'right',
      pipe: 'currency',
      pipeArgs: ['ARS', 'symbol-narrow', '1.2-2', 'es-AR']
    }
  ];

  // Help content
  helpContent = `
    <div style="line-height: 1.6;">
      <p><strong>Bienvenido a la Gestión de Órdenes de Compra</strong></p>
      <p>Desde esta pantalla podés administrar todas las órdenes de compra del laboratorio.</p>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Acciones disponibles:</h4>
      <ul style="margin-left: 20px;">
        <li><i class="pi pi-plus" style="color: #10b981;"></i> <strong>Agregar:</strong> Crea una nueva orden de compra</li>
        <li><i class="pi pi-eye" style="color: #3b82f6;"></i> <strong>Ver:</strong> Consulta los detalles completos</li>
        <li><i class="pi pi-pencil" style="color: #f59e0b;"></i> <strong>Editar:</strong> Modifica la información</li>
        <li><i class="pi pi-ban" style="color: #ef4444;"></i> <strong>Desactivar:</strong> Deshabilita una orden (no disponible para PENDING o SENT)</li>
        <li><i class="pi pi-check" style="color: #10b981;"></i> <strong>Reactivar:</strong> Habilita una orden inactiva</li>
      </ul>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Filtros:</h4>
      <p>Usá el botón <i class="pi pi-filter"></i> para filtrar por estado o actividad (Activos/Inactivos).</p>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Reglas de negocio:</h4>
      <p>⚠️ No se pueden desactivar órdenes en estado PENDING o SENT. Primero debe cambiar el estado.</p>
    </div>
  `;

  /**
   * Gets the actions available for an order according to its state.
   * Includes View, Edit, and options to change the status.
   */
  getActionsForPurchaseOrder = (row: ResponsePurchaseOrderDTO): MenuItem[] => {
    const actions: MenuItem[] = [];

    // Normalize status: convert to uppercase and remove spaces
    const currentStatus = String(row.status || '').toUpperCase().trim();

    // ===== BASIC ACTIONS (always available) =====

    // View
    actions.push({
      id: 'view',
      label: 'Ver',
      icon: 'pi pi-eye',
      command: () => {
        if (!this.canManage) {
          this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden ver órdenes de compra');
          return;
        }
        this.viewPurchaseOrder(row);
      }
    });

    if (currentStatus !== 'CANCELLED') {
      actions.push({
        id: 'edit',
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (!this.canManage) {
            this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden editar órdenes de compra');
            return;
          }
          this.editPurchaseOrder(row);
        }
      });
    }

    // ===== STATUS ACTIONS (conditional) =====

    // If PENDING: can mark as Sent or Cancel
    if (currentStatus === 'PENDING') {
      actions.push({ separator: true });

      actions.push({
        id: 'send',
        label: 'Marcar como Enviada',
        icon: 'pi pi-send',
        command: () => {
          if (!this.canManage) {
            this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden cambiar el estado');
            return;
          }
          this.changeOrderStatus(row, 'SENT');
        }
      });
    }
    // If SENT, can transition to RECEIVED
    if (currentStatus === 'SENT') {
      actions.push({
        id: 'receive',
        label: 'Marcar como Recibida',
        icon: 'pi pi-check-circle',
        command: () => {
          if (!this.canManage) { this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden cambiar el estado'); return; }
          this.openReceiveConfirmModal(row);
        }
      });

      actions.push({
        id: 'cancel',
        label: 'Cancelar',
        icon: 'pi pi-times-circle',
        command: () => {
          if (!this.canManage) {
            this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden cancelar órdenes');
            return;
          }
          this.showCancelModal(row);
        }
      });
    }

    return actions.filter(item => !item.separator);
  };

  /**
   * Maps the backend status to the Spanish label for the UI
   * FORMAT: UPPERCASE
   */
  public getStatusLabel(status?: string): string {
    if (!status) return '-';
    switch (String(status).toUpperCase()) {
    case 'SENT':
      return 'ENVIADA';
    case 'CANCELLED':
      return 'CANCELADA';
    case 'PENDING':
      return 'PENDIENTE';
    case 'RECEIVED':
    case 'RECIVED':
      return 'RECIBIDA';
    default:
      // Return in UPPERCASE
      return String(status).toUpperCase();
    }
  }

  /**
   * Maps the backend status to the `app-generic-badge` token for coloring
   */
  public getBadgeToken(status?: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
    if (!status) return 'inactivo';
    switch (String(status).toUpperCase()) {
    case 'SENT':
      return 'verificado'; // SENT -> verified (green)
    case 'PENDING':
      return 'pendiente'; // PENDING -> pending (yellow)
    case 'RECEIVED':
    case 'RECIVED':
      return 'completo'; // RECEIVED -> complete (blue)
    case 'CANCELLED':
      return 'inactivo'; // CANCELLED -> inactive (warn)
    default:
      return 'inactivo';
    }
  }

  /**
   * Transforms backend orders for display in the table
   * Flattens the supplier object and formats the date
   * Sorts by order date descending (most recent first)
   */
  private transformOrdersForTable(orders: ResponsePurchaseOrderDTO[]): any[] {
    const transformed = orders.map(order => {
      // Extract supplier name
      const supplierName = order.supplier?.companyName || '-';

      // Concatenate cancellation reason to notes if it exists
      let notesWithCancellation = order.notes || '';
      if (order.status === 'CANCELLED' && order.cancellationReason) {
        const prefix = ' - Motivo de cancelación: ';
        if (notesWithCancellation) {
          notesWithCancellation = `${notesWithCancellation}\n${prefix}${order.cancellationReason}`;
        } else {
          notesWithCancellation = `${prefix}${order.cancellationReason}`;
        }
      }

      return {
        ...order,
        orderDateFormatted: this.formatDate(order.orderDate),
        supplierName: supplierName,
        destinationLocationName: order.destinationLocation?.name || '-',
        status: order.status,
        statusLabel: this.getStatusLabel(order.status),
        notes: notesWithCancellation
      };
    });

    // Sort by order date descending (most recent first)
    // If dates are equal, sort by purchaseOrderNumber descending
    return transformed.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();

      // Compare by date first
      if (dateB !== dateA) {
        return dateB - dateA; // Descending: most recent first
      }

      // If dates are equal, sort by purchaseOrderNumber descending
      const numberA = a.purchaseOrderNumber || '';
      const numberB = b.purchaseOrderNumber || '';
      return numberB.localeCompare(numberA); // Descending: higher numbers first
    });
  }

  /**
   * Formats a date to DD/MM/YYYY
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  }

  /**
   * Handle filter changes
   */
  onFilterChange(event: FilterChangeEvent): void {
    // Reset optional filters
    this.purchaseOrderFilters.status = undefined;

    // Apply each filter from the event
    event.filters.forEach(filter => {
      switch (filter.id) {
      case 'status':
        this.purchaseOrderFilters.status = filter.value as string || undefined;
        break;
      case 'is_active':
        this.purchaseOrderFilters.isActive = filter.value as boolean;
        break;
      }
    });

    // Reset to first page when applying filters
    this.purchaseOrderFilters.page = 0;
    // Reload with new filters
    this.loadPurchaseOrders();
  }

  /**
   * Handles global filter (search) changes
   * Emits to debounced stream instead of calling API directly
   * @param searchTerm - The search term entered by the user
   */
  onGlobalFilter(searchTerm: string): void {
    this.globalFilter$.next(searchTerm);
  }

  /**
   * Handle page changes
   * @param event - Pagination event with first (index of first record) and rows (rows per page)
   */
  onPageChange(event: { first: number; rows: number }): void {
    // Convert first/rows to page/size for the backend
    this.purchaseOrderFilters.page = Math.floor(event.first / event.rows);
    this.purchaseOrderFilters.size = event.rows;
    this.loadPurchaseOrders();
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
    if (sort.field === 'orderDateFormatted') {
      backendField = 'orderDate';
    } else if (sort.field === 'purchaseOrderNumber') {
      backendField = 'purchaseOrderNumber';
    } else if (sort.field === 'status') {
      backendField = 'status';
    }

    // Format expected by Spring: "field,direction"
    const sortDirection = sort.order === 'asc' ? 'asc' : 'desc';
    this.purchaseOrderFilters.sort = `${backendField},${sortDirection}`;

    // Reset to first page when changing sorting
    this.purchaseOrderFilters.page = 0;
    this.loadPurchaseOrders();
  }

  /**
   * Create new purchase order
   */
  createPurchaseOrder(): void {
    this.router.navigate(['/procurement-inventory/purchase-orders/create']);
  }

  /**
   * View purchase order details
   */
  viewPurchaseOrder(purchaseOrder: ResponsePurchaseOrderDTO): void {
    this.router.navigate(['/procurement-inventory/purchase-orders/view', purchaseOrder.id]);
  }

  /**
   * Edit purchase order
   */
  editPurchaseOrder(purchaseOrder: ResponsePurchaseOrderDTO): void {
    this.router.navigate(['/procurement-inventory/purchase-orders/edit', purchaseOrder.id]);
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
   * Load purchase orders with current filters
   */
  loadPurchaseOrders(): void {
    this.loading = true;
    this.cdr.markForCheck();

    // IMPORTANTE: Limpiar el caché de detalles al recargar órdenes
    // Esto asegura que cuando se expande una orden después de editarla,
    // se cargan los detalles actualizados desde el backend
    this.purchaseOrderDetailsMap.clear();
    this.loadingDetailsMap.clear();

    // Determine if user can manage purchase orders
    const roles = this.authService.getUserRoles();
    this.canManage = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');

    this.purchaseOrdersService.search(this.purchaseOrderFilters).subscribe({
      next: (response: any) => {
        const rawOrders = Array.isArray(response) ? response : (response.content || []);
        this.purchaseOrders = this.transformOrdersForTable(rawOrders);
        // Extract pagination information from backend
        if (response && !Array.isArray(response)) {
          this.totalRecords = response.total_elements || response.totalElements || 0;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (_error: any) => {
        this.loading = false;
        if (_error?.status === 403) {
          this.showError('Acceso denegado: Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden listar órdenes de compra.');
          return;
        }
        // Show generic error
        this.alertMessage = 'Error al cargar las órdenes de compra';
        this.alertType = 'error';
        this.showAlert = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.showAlert = false;
          this.cdr.markForCheck();
        }, 5000);
      }
    });
  }

  /**
   * Export handler (excel/pdf)
   */
  onExport(event: { type: 'excel' | 'pdf' }): void {
    if (event.type === 'excel') {
      this.purchaseOrdersService.exportPurchaseOrdersToExcel(this.purchaseOrderFilters).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `pedidos_de_compra_${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      });
    }
  }

  // Minimal properties and methods for modals (deactivation action is disabled)
  showDeactivationModal = false;
  showReactivationModal = false;
  purchaseOrderToDeactivate: ResponsePurchaseOrderDTO | null = null;
  purchaseOrderToReactivate: ResponsePurchaseOrderDTO | null = null;

  /**
   * Deactivation modal message text
   * @returns Confirmation message to deactivate the order
   */
  get deactivationModalMessage(): string {
    const orderId = this.purchaseOrderToDeactivate?.id || '';
    return `¿Está seguro que desea desactivar la orden de compra #${orderId}?`;
  }

  /**
   * Reactivation modal message text
   * @returns Confirmation message to reactivate the order
   */
  get reactivationModalMessage(): string {
    const orderId = this.purchaseOrderToReactivate?.id || '';
    return `¿Está seguro que desea reactivar la orden de compra #${orderId}?`;
  }

  /**
   * Deactivation confirmation (action disabled).
   * Shows an alert and closes the modal.
   */
  confirmDeactivation(): void {
    // Disabled functionality: show notice
    this.showError('La acción de desactivar órdenes está deshabilitada.');
    this.closeDeactivationModal();
  }

  /**
   * Close deactivation modal
   */
  closeDeactivationModal(): void {
    this.showDeactivationModal = false;
    this.purchaseOrderToDeactivate = null;
    this.cdr.markForCheck();
  }

  /**
   * Reactivation confirmation (action disabled).
   * Shows an alert and closes the modal.
   */
  confirmReactivation(): void {
    this.showError('La acción de reactivar órdenes está deshabilitada.');
    this.closeReactivationModal();
  }

  /**
   * Close reactivation modal
   */
  closeReactivationModal(): void {
    this.showReactivationModal = false;
    this.purchaseOrderToReactivate = null;
    this.cdr.markForCheck();
  }

  /**
   * OnInit - configure breadcrumb and load data
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Órdenes de compra',
      '/procurement-inventory/purchase-orders'
    );

    // Setup debounced global filter subscription
    this.globalFilter$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.purchaseOrderFilters.searchTerm = searchTerm.trim() || undefined;
        this.purchaseOrderFilters.page = 0;
        this.loadPurchaseOrders();
      });

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('purchase-orders')) return;

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });

    // Evaluate permissions and load
    const roles = this.authService.getUserRoles();
    this.canManage = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');
    if (!this.canManage) {
      // Show initial alert indicating required permission
      this.showError('Acceso restringido: Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden gestionar órdenes de compra.');
      // Even though we show alert, we try to load so backend can return 403 or limited data
    }
    this.loadPurchaseOrders();
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * AfterViewInit - Initialize table columns
   */
  ngAfterViewInit(): void {
    // Initialize columns with badge template for status
    this.columns = [
      { field: 'purchaseOrderNumber', header: 'Orden de Compra', sortable: true },
      { field: 'orderDateFormatted', header: 'Fecha orden', sortable: true },
      { field: 'supplierName', header: 'Proveedor', sortable: false },
      { field: 'status', header: 'Estado', sortable: true, template: this.statusBadgeTemplate },
      { field: 'destinationLocationName', header: 'Ubicación destino', sortable: false },
      { field: 'notes', header: 'Notas', sortable: false }
    ];
    // Associate expanded rows template
    this.cdr.markForCheck();
  }

  /**
   * Ensures that order details are loaded in the cache.
   * Called from the expanded template when the row is expanded.
   */
  ensureDetailsLoaded(orderId: number): boolean {
    if (!orderId) return true;
    if (this.purchaseOrderDetailsMap.has(orderId) || this.loadingDetailsMap.get(orderId)) return true;
    this.loadDetailsForOrder(orderId);
    return true;
  }

  /**
   * Gets the transformed details for a purchase order to display in the generic table
   * @param orderId - Purchase order ID
   * @returns Array of details with fields matching the column definitions
   */
  getDetailsForOrder(orderId: number): any[] {
    const details = this.purchaseOrderDetailsMap.get(orderId) || [];
    return details.map(detail => ({
      supplierItemDescription: detail.supplierItem?.description || detail.supply?.name || 'N/D',
      uomName: detail.uom_name || detail.unitOfMeasure?.name || '-',
      packagingDescription: detail.packaging_description || detail.packaging?.description || '-',
      quantity: detail.quantity || 0,
      unitPrice: detail.unit_price || detail.historicalPrice || 0
    }));
  }

  /**
   * Load details for a specific order and update the cache
   * @param orderId Purchase order ID
   */
  private loadDetailsForOrder(orderId: number): void {
    this.loadingDetailsMap.set(orderId, true);
    // Load all order details
    this.purchaseOrderDetailsService.getByPurchaseOrder(orderId).subscribe({
      next: (response: any) => {
        // Normalize response: can be direct Array or object with content (paginated)
        let detailsArray = Array.isArray(response) ? response : (response?.content || []);

        // FILTRAR SOLO DETALLES ACTIVOS - Los desactivados no deben mostrarse
        detailsArray = detailsArray.filter((detail: any) => {
          const isActive = detail.is_active ?? detail.isActive ?? detail.active ?? true;
          return isActive === true;
        });

        // Normalize each detail to ensure required fields
        const normalizedDetails = detailsArray.map((detail: any) => {
          // Extract supplier_item in different possible forms
          const supplierItem = detail.supplier_item ||
                              detail.supplierItem ||
                              detail.item ||
                              null;

          const supplierItemDescription = supplierItem?.description ||
                                         supplierItem?.name ||
                                         supplierItem?.item_description ||
                                         'N/D';

          // Extract packaging and UOM information
          const packaging = detail.packaging || detail.Packaging || supplierItem?.packaging || {};
          const uom = detail.unitOfMeasure || detail.unit_of_measure || packaging.uom || packaging.Uom || {};

          const unitsPerPackage = packaging.units_per_package || packaging.unitsPerPackage || 1;
          const uomName = uom.name || uom.abbreviation || packaging.uomName || packaging.uom_name || '';

          // Build packaging_description using correct UOM
          let packagingDescription;
          if (uomName) {
            packagingDescription = `${uomName} X ${unitsPerPackage}`;
          } else {
            packagingDescription = packaging.description || `Unidad X ${unitsPerPackage}`;
          }

          return {
            ...detail,
            // Ensure quantity and unit_price exist
            quantity: detail.quantity || 0,
            unit_price: detail.unit_price || detail.unitPrice || detail.historicalPrice || 0,
            historicalPrice: detail.historicalPrice || detail.unit_price || detail.unitPrice || 0,
            // Normalize related objects
            supply: detail.supply || {
              id: detail.supply_id || detail.supplyId,
              name: detail.supply?.name || 'N/D'
            },
            unitOfMeasure: {
              ...uom,
              name: uomName,
              abbreviation: uom.abbreviation || uomName
            },
            unit_of_measure: {
              ...uom,
              name: uomName,
              abbreviation: uom.abbreviation || uomName
            },
            uom_name: uomName,
            // Normalize packaging with correct description
            packaging: {
              ...packaging,
              units_per_package: unitsPerPackage,
              unitsPerPackage: unitsPerPackage,
              description: packagingDescription
            },
            packaging_description: packagingDescription,
            supplierItem: {
              id: supplierItem?.id || detail.supplier_item_id || detail.supplierItemId,
              description: supplierItemDescription
            },
            supplier_item: {
              id: supplierItem?.id || detail.supplier_item_id || detail.supplierItemId,
              description: supplierItemDescription
            }
          };
        });

        this.purchaseOrderDetailsMap.set(orderId, normalizedDetails);
        this.loadingDetailsMap.set(orderId, false);
        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        // Error loading details (probably 500 from backend due to missing PackagingEntity)
        // Don't block UI, just show empty array
        this.purchaseOrderDetailsMap.set(orderId, []);
        this.loadingDetailsMap.set(orderId, false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Show confirmation modal to change order status
   */
  showStatusChangeConfirmation(order: ResponsePurchaseOrderDTO, newStatus: string): void {
    this.orderToChangeStatus = order;
    this.targetStatus = newStatus;
    this.targetStatusLabel = this.getStatusLabel(newStatus);
    this.showStatusChangeModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Change order status directly without confirmation modal
   * @param order Purchase order to update
   * @param newStatus New status to set
   */
  changeOrderStatus(order: ResponsePurchaseOrderDTO, newStatus: string): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.purchaseOrdersService.update(order.id, { status: newStatus }).subscribe({
      next: () => {
        this.showSuccess(`Orden cambiada a estado ${this.getStatusLabel(newStatus)} exitosamente`);
        this.loadPurchaseOrders();
      },
      error: (error: any) => {
        this.loading = false;
        this.showError(error?.error?.message || 'Error al cambiar el estado de la orden');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Confirm order status change
   */
  confirmStatusChange(): void {
    if (!this.orderToChangeStatus?.id || !this.targetStatus) return;

    this.loading = true;
    this.showStatusChangeModal = false;
    this.cdr.markForCheck();

    this.purchaseOrdersService.update(this.orderToChangeStatus.id, { status: this.targetStatus }).subscribe({
      next: () => {
        this.showSuccess(`Orden cambiada a estado ${this.targetStatusLabel} exitosamente`);
        this.orderToChangeStatus = null;
        this.targetStatus = '';
        this.targetStatusLabel = '';
        this.loadPurchaseOrders();
      },
      error: (error: any) => {
        this.loading = false;
        this.showError(error?.error?.message || 'Error al cambiar el estado de la orden');
        this.orderToChangeStatus = null;
        this.targetStatus = '';
        this.targetStatusLabel = '';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancel status change modal
   */
  cancelStatusChangeModal(): void {
    this.showStatusChangeModal = false;
    this.orderToChangeStatus = null;
    this.targetStatus = '';
    this.targetStatusLabel = '';
    this.cdr.markForCheck();
  }

  /**
   * Status change modal message
   */
  get statusChangeModalMessage(): string {
    return `¿Está seguro que desea cambiar el estado de la orden de compra a "${this.targetStatusLabel}"?`;
  }

  /**
   * Show modal to cancel an order (requires reason)
   */
  showCancelModal(order: ResponsePurchaseOrderDTO): void {
    this.orderToCancel = order;
    this.cancelModalMessage = 'Está por cancelar la orden de compra. Esta acción requiere que proporcione un motivo de cancelación.';
    this.showCancelConfirmModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirm order cancellation with the entered reason
   * @param reason - Cancellation reason entered by user (can be string or void from confirmed event)
   */
  confirmCancelOrder(reason?: any): void {
    if (!this.orderToCancel?.id) return;

    // Validate that there is a reason
    const cancellationReason = typeof reason === 'string' ? reason.trim() : '';
    if (!cancellationReason) {
      this.showError('Debe ingresar un motivo de cancelación');
      return;
    }

    this.loading = true;
    this.showCancelConfirmModal = false;
    this.cdr.markForCheck();

    this.purchaseOrdersService.update(this.orderToCancel.id, {
      status: 'CANCELLED',
      cancellation_reason: cancellationReason
    }).subscribe({
      next: () => {
        this.showSuccess('Orden cancelada exitosamente');
        this.orderToCancel = null;
        this.cancelModalMessage = '';
        this.loadPurchaseOrders();
      },
      error: (error: any) => {
        this.loading = false;
        this.showError(error?.error?.message || 'Error al cancelar la orden');
        this.orderToCancel = null;
        this.cancelModalMessage = '';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancel cancellation modal
   */
  cancelCancelModal(): void {
    this.showCancelConfirmModal = false;
    this.orderToCancel = null;
    this.cancelModalMessage = '';
    this.cdr.markForCheck();
  }

  /**
   * Show success message
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
   * Show modal to confirm order reception
   */
  openReceiveConfirmModal(order: ResponsePurchaseOrderDTO): void {
    this.orderToReceive = order;
    this.showReceiveConfirmModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirm order reception and redirect to delivery notes form
   * with order data preloaded
   */
  confirmReceiveOrder(): void {
    if (!this.orderToReceive?.id) return;

    // Load order details before navigating
    this.loading = true;
    this.cdr.markForCheck();

    this.purchaseOrderDetailsService.getByPurchaseOrder(this.orderToReceive.id).subscribe({
      next: (response: any) => {
        let detailsArray = Array.isArray(response) ? response : (response?.content || []);

        // FILTRAR SOLO DETALLES ACTIVOS - Los desactivados no deben mostrarse
        detailsArray = detailsArray.filter((detail: any) => {
          const isActive = detail.is_active ?? detail.isActive ?? detail.active ?? true;
          return isActive === true;
        });

        // Prepare data to preload in delivery notes form
        const preloadData = {
          purchaseOrderId: this.orderToReceive!.id,
          supplierId: this.orderToReceive!.supplier?.id,
          status: 'PENDING',
          details: detailsArray.map((detail: any) => ({
            supplierItemId: detail.supplierItem?.id,
            supplierItemName: detail.supplierItem?.description,
            requestedQuantity: detail.quantity || 0,
            receivedQuantity: detail.quantity || 0
          }))
        };

        // Navigate to creation form with data
        this.router.navigate(['/procurement-inventory/goods-receipts/create'], {
          state: { preloadData }
        });

        this.loading = false;
        this.showReceiveConfirmModal = false;
        this.orderToReceive = null;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.loading = false;
        this.showError(error?.error?.message || 'Error al cargar los detalles de la orden');
        this.showReceiveConfirmModal = false;
        this.orderToReceive = null;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cancel receive confirmation modal
   */
  cancelReceiveModal(): void {
    this.showReceiveConfirmModal = false;
    this.orderToReceive = null;
    this.cdr.markForCheck();
  }
}
