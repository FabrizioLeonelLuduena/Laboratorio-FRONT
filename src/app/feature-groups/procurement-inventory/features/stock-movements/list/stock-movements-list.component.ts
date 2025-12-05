import { CommonModule, DOCUMENT, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { StockMovementType } from '../../../enums/movementType.enum';
import { ResponseBatchDTO } from '../../../models/batches/batches.model';
import { ResponseDeliveryNoteDetailDTO } from '../../../models/goods-receipt-details/goods-receipt-details.models';
import { ResponseLocationDTO } from '../../../models/locations/locations.model';
import { StockLocationDTO } from '../../../models/stock-locations/stock-locations.model';
import { ExitReason, StockMovementFiltersDTO } from '../../../models/stock-movements/stockMovements.model';
import { ResponseSupplierItemDTO, ResponseSupplierItemsBySupplierIdDTO } from '../../../models/supplier-items/supplier-items.model';
import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';
import { SupplyDetailResponseDTO } from '../../../models/supplies/supplies.model';
import { GoodsReceiptsService } from '../../../services/goods-receipts/goods-receipts.service';
import { StockLocationsService } from '../../../services/stock-locations.service';
import { StockMovementsService } from '../../../services/stock-movements/stock-movements.service';
import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { FormDataLoaderService } from '../form-data-loader.service';
import { StockMovementStrategyService } from '../stock-movement-strategy.service';

// Interfaces used locally
/** Movement header interface */
interface MovementHeader {
  locationId: number | null;
  originLocationId?: number | null;
  supplierId?: number | null;
  supplierName?: string; // Nombre del proveedor para display (solo lectura)
  originLocationName?: string; // Nombre de la ubicación de origen para display (solo lectura)
  reason?: string;
  refDocType?: string;
  refDocId?: number;
  exitReason?: ExitReason | string; // Tipo de egreso (solo para RETURN)
}

/** Stock item interface */
interface StockItem {
  supplyId: number | null;
  supplyName?: string; // Nombre del producto para display (solo lectura)
  supplierItemId?: number | null; // Para devoluciones
  quantity: number | string;
  batchNumber?: string;
  batchId?: number | null; // ID del lote seleccionado
  expirationDate?: string | Date;
  notes?: string;
  availableBatches?: ResponseBatchDTO[]; // Lotes disponibles para el producto
  maxQuantity?: number; // Cantidad máxima disponible en la ubicación de origen (para TRANSFER)
  isReadOnly?: boolean; // Flag para indicar si el item es de solo lectura
  supplierItemName?: string;
}

/** Interface describing table rows with flattened movement data and extra fields */
interface StockMovementTableData {
  id: number;
  supply: any;
  batch: any;
  quantity: number;
  movementDate: string;
  movementType: string;
  originLocation: any;
  destinationLocation: any;
  details?: any[];
  reason?: string;
  creationDate: string;
  originName: string;
  destinationName: string;
  adjustmentReasonLabel?: string;
  supplierName?: string;
  movementTypeLabel?: string;
  exitReasonLabel?: string;
}


/**
 * Stock movements list view responsible for switching movement types and managing the creation flow.
 */
@Component({
  selector: 'app-stock-movements-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AccordionModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    TabsModule,
    TagModule,
    TooltipModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericTableComponent,
    TutorialOverlayComponent
  ],
  templateUrl: './stock-movements-list.component.html',
  styleUrls: ['./stock-movements-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockMovementsListComponent implements OnInit, OnDestroy {
  private readonly stockMovementsService = inject(StockMovementsService);
  private readonly stockLocationsService = inject(StockLocationsService);
  private readonly supplierItemsService = inject(SupplierItemsService);
  private readonly goodsReceiptsService = inject(GoodsReceiptsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly strategyService = inject(StockMovementStrategyService);
  private readonly dataLoader = inject(FormDataLoaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly messageService = inject(MessageService);
  private readonly document = inject(DOCUMENT);
  private readonly tutorialService = inject(TutorialService);

  // Tutorial
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;
  private tutorialSub?: any;

  // Tutorial configuration that changes dynamically based on selected movement type
  tutorialConfig = computed<TutorialConfig>(() => {
    const movementType = this.selectedMovementType();
    const isEntry = movementType === StockMovementType.PURCHASE;
    const isTransfer = movementType === StockMovementType.TRANSFER;
    const isReturn = movementType === StockMovementType.RETURN;
    const _isAdjustment = movementType === StockMovementType.ADJUSTMENT;

    // Dynamic content based on movement type
    const movementTypeMessage = isEntry
      ? 'Actualmente estás en el modo de Entrada (Compras). Puedes cambiar a Transferencias, Egresos o Ajustes según necesites.'
      : isTransfer
        ? 'Actualmente estás en el modo de Transferencia. Mueve stock entre ubicaciones de forma controlada.'
        : isReturn
          ? 'Actualmente estás en el modo de Egreso (Devoluciones). Registra devoluciones a proveedores.'
          : 'Actualmente estás en el modo de Ajuste. Corrige discrepancias en el inventario.';

    const _headerMessage = isEntry
      ? 'Define el proveedor y la ubicación destino donde ingresará el stock. Puedes agregar un motivo opcional para documentar la operación.'
      : isTransfer
        ? 'Define la ubicación de origen (desde donde se retira) y la ubicación destino (donde ingresará el stock).'
        : isReturn
          ? 'Define la ubicación de origen desde donde se devolverá el stock al proveedor.'
          : 'Define la ubicación y el motivo del ajuste de inventario (ej: "Merma", "Robo", "Recuento físico").';

    return {
      steps: [
        {
          target: '.movement-type-selector-container',
          title: 'Tipos de movimiento',
          message: movementTypeMessage,
          position: 'bottom',
          highlightPadding: 8
        },
        {
          target: 'section.section-box:first-of-type',
          title: 'Formulario de ingreso',
          message: 'Esta es la sección del formulario donde cargas los datos del movimiento.',
          position: 'top',
          highlightPadding: 8,
          onEnter: () => {
            if (this.formSectionCollapsed) {
              this.toggleFormSection();
            }
          }
        },
        {
          target: 'app-generic-table:table-intro',
          title: 'Historial de movimientos',
          message: 'Aquí visualizas todos los movimientos registrados con su encabezado y primera fila. Puedes expandir cada movimiento para ver sus detalles.',
          position: 'top',
          highlightPadding: 8,
          onEnter: () => {
            // Only open history if it's collapsed, don't close the form
            if (this.historySectionCollapsed) {
              this.toggleHistorySection();
            }
          }
        },
        {
          target: 'app-generic-table .search-box',
          title: 'Búsqueda rápida',
          message: 'Utiliza la barra de búsqueda para encontrar movimientos de forma rapida.',
          position: 'right',
          highlightPadding: 8
        },
        {
          target: '.download-menu-container button',
          title: 'Exportar datos',
          message: 'Exporta el historial de movimientos a formato Excel para análisis externo o reportes.',
          position: 'left',
          onEnter: () => {
            if (this.genericTable && this.stockMovements().length > 0) {
              const firstRow = this.stockMovements()[0];
              const key = firstRow.id;
              this.genericTable.expandedRowKeys[key] = false;
            }
          }
        }
      ],
      onComplete: () => {
        // Close any open popover
        if (document.querySelector('.p-popover-content')) {
          document.body.click();
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Tutorial completado',
          detail: 'Tutorial completado! Ya conoces cómo gestionar movimientos de stock.'
        });
      },
      onSkip: () => {
        // Tutorial skipped by user
      }
    };
  });

  // Signals para los tipos de movimiento y tabs
  selectedMovementType = signal<StockMovementType>(StockMovementType.PURCHASE);

  movementTypeOptions = [
    { label: 'Entrada', value: StockMovementType.PURCHASE, icon: 'pi pi-arrow-down' },
    { label: 'Transferencia', value: StockMovementType.TRANSFER, icon: 'pi pi-arrow-right-arrow-left' },
    { label: 'Egreso', value: StockMovementType.RETURN, icon: 'pi pi-arrow-up' },
    { label: 'Ajuste', value: StockMovementType.ADJUSTMENT, icon: 'pi pi-sliders-h' }
  ];

  // Datos como signal para reactividad
  stockMovements = signal<StockMovementTableData[]>([]);
  selectedLocation = signal<Partial<StockLocationDTO>>({});
  loading = false;

  // Alertas
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  // Flag to disable all header fields.
  // This is activated, for example, when preloading details from a delivery note to prevent header modification.
  disableHeaderFields: boolean = false;

  // Flag to control if RETURN movements can be created
  // Only true when coming from goods-receipts
  canCreateReturn: boolean = false;

  // Collapsible sections
  formSectionCollapsed = false;
  historySectionCollapsed = false;

  // ========== PROPIEDADES DEL FORMULARIO DE CREACIÓN ==========
  formTitle = 'Ingreso de stock';

  movementHeader: MovementHeader = {
    locationId: null,
    originLocationId: null,
    reason: '',
    supplierId: null
  };

  editableItems: StockItem[] = [];

  editingIndex: number = -1;

  locations: ResponseLocationDTO[] = [];
  supplies: SupplyDetailResponseDTO[] = [];
  filteredSupplies: {id:number, name:string}[] = [];
  suppliers: ResponseSupplierDTO[] = [];
  supplierItems: ResponseSupplierItemDTO[] = [];

  stockLocations: StockLocationDTO[] = [];

  saving = false;

  // Minimum date for expiration date calendar (today)
  minExpirationDate: Date = new Date();

  private pendingPreloadedDetails: ResponseDeliveryNoteDetailDTO[] | null = null;

  // ========== PROPIEDADES DE LA TABLA ==========
  filters: any[] = [
    {
      id: 'movementType',
      label: 'Tipo de Movimiento',
      type: 'radio',
      options: [
        { label: 'Todos', value: null, active: false },
        { label: 'Entrada', value: StockMovementType.PURCHASE, active: false },
        { label: 'Transferencia', value: StockMovementType.TRANSFER, active: false },
        { label: 'Ajuste', value: StockMovementType.ADJUSTMENT, active: false }
      ]
    }
  ];

  stockMovementFilters: StockMovementFiltersDTO = {
    page: 0,
    size: 10,
    sort: 'id,desc'
  };

  private ingresoColumns = [
    { field: 'movementTypeLabel', header: 'Tipo', sortable: false },
    { field: 'creationDate', header: 'Fecha', sortable: true },
    { field: 'supplierName', header: 'Proveedor', sortable: false },
    { field: 'destinationName', header: 'Ubicación de destino', sortable: false }
  ];

  private salidaColumns = [
    { field: 'movementTypeLabel', header: 'Tipo', sortable: false },
    { field: 'creationDate', header: 'Fecha', sortable: true },
    { field: 'originName', header: 'Ubicación de origen', sortable: false },
    { field: 'exitReasonLabel', header: 'Tipo de egreso', sortable: false }
  ];

  private transferenciaColumns = [
    { field: 'movementTypeLabel', header: 'Tipo', sortable: false },
    { field: 'creationDate', header: 'Fecha', sortable: true },
    { field: 'originName', header: 'Ubicación de origen', sortable: false },
    { field: 'destinationName', header: 'Ubicación de destino', sortable: false }
  ];

  private ajusteColumns = [
    { field: 'movementTypeLabel', header: 'Tipo', sortable: false },
    { field: 'creationDate', header: 'Fecha', sortable: true },
    { field: 'destinationName', header: 'Ubicación de destino', sortable: false },
    { field: 'adjustmentReasonLabel', header: 'Motivo', sortable: false }
  ];

  /**
   * Column definitions for the details table inside the expanded row
   */
  detailColumns = [
    { field: 'supplyName', header: 'Producto', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true },
    { field: 'batchNumber', header: 'Nro. lote', sortable: true },
    { field: 'expirationDate', header: 'Vencimiento', sortable: true },
    { field: 'notes', header: 'Notas', sortable: false }
  ];

  /**
   * Column definitions for transfer movement details (includes destination location)
   */
  detailColumnsTransfer = [
    { field: 'supplyName', header: 'Producto', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true },
    { field: 'batchNumber', header: 'Nro. lote', sortable: true },
    { field: 'expirationDate', header: 'Vencimiento', sortable: true },
    { field: 'destinationName', header: 'Ubicación destino', sortable: false },
    { field: 'notes', header: 'Notas', sortable: false }
  ];

  /**
   * Maps a backend movement payload into the list of detail items rendered in the table.
   */
  getDetailsFromMovement(movement: any): any[] {
    if (!movement || !movement.details || !Array.isArray(movement.details)) {
      return [];
    }

    return movement.details.map((detail: any) => {
      const supply = detail.supply || {};
      const batch = detail.batch || {};

      return {
        supplyName: supply.name || 'Sin información',
        quantity: detail.quantity || 0,
        batchNumber: batch.batch_code || batch.batchCode || batch.batchNumber || batch.batch_number || 'Sin lote',
        expirationDate: batch.expirationDate || batch.expiration_date
          ? this.formatExpirationDate(batch.expirationDate || batch.expiration_date)
          : 'Sin vencimiento',
        destinationName: movement.destinationName || 'Sin información',
        notes: detail.notes || ''
      };
    });
  }

  columns = this.ingresoColumns;

  // Expose StockMovementType enum for template
  readonly StockMovementType = StockMovementType;

  // Expose ExitReason enum for template
  readonly ExitReason = ExitReason;

  // Options for exit reason dropdown (RETURN movements)
  exitReasonOptions = [
    { label: 'Devolución a proveedor', value: ExitReason.SUPPLIER_RETURN },
    { label: 'Consumo interno', value: ExitReason.CONSUMPTION }
  ];

  /**
   * Creates the component and reacts to movement type changes to refresh data and UI.
   */
  constructor() {
    effect(() => {
      const type = this.selectedMovementType();

      this.formTitle = this.getFormTitle(type);
      if (!this.pendingPreloadedDetails) {
        this.resetForm();
      }
      if (type === StockMovementType.RETURN || type === StockMovementType.TRANSFER || type === StockMovementType.ADJUSTMENT) {
        this.loadStockLocations();
      }
      this.updateColumnsForMovementType(type);
      this.stockMovementFilters.movementType = this.mapMovementTypeToBackend(type);
      this.loadStockMovements();
      this.loadCatalogs();
      this.cdr.markForCheck();
    });
  }

  /**
   * Map frontend StockMovementType enum to backend expected string or null
   */
  private mapMovementTypeToBackend(type: StockMovementType): string | undefined {
    switch (type) {
    case StockMovementType.PURCHASE:
      return 'PURCHASE';
    case StockMovementType.TRANSFER:
      return 'TRANSFER';
    case StockMovementType.ADJUSTMENT:
      return 'ADJUSTMENT';
    case StockMovementType.RETURN:
      return 'RETURN';
    default:
      return undefined;
    }
  }

  /**
   * Reconfigures the table columns to match the currently active movement type.
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Movimientos de stock',
      '/procurement-inventory/stock-movements'
    );

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('stock-movements')) return;

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });

    // Capture navigation state early before it's lost
    const navigationState = this.router.getCurrentNavigation()?.extras?.state || (globalThis as any).history?.state;
    const preloadedDetails = navigationState?.['preloadedDetails'];
    const preloadedSupplierId = navigationState?.['supplierId'];
    const preloadedSupplierName = navigationState?.['supplierName'];
    const preloadedOriginLocationName = navigationState?.['originLocationName'];
    const preloadedExitReason = navigationState?.['exitReason'];
    const preloadedReason = navigationState?.['reason'];
    const metadata = navigationState?.['metadata'];
    const fromGoodReceipts = navigationState?.['fromGoodReceipts'];

    // Set flag to allow RETURN creation if coming from goods-receipts
    this.canCreateReturn = fromGoodReceipts === true || sessionStorage.getItem('egreso_access_from_goods_receipts') === 'true';

    // Store preloaded details for later use
    if (preloadedDetails && preloadedDetails.length > 0) {
      this.pendingPreloadedDetails = preloadedDetails;

      // Preload header data if available
      if (preloadedSupplierId) {
        this.movementHeader.supplierId = Number(preloadedSupplierId);
      }
      if (preloadedSupplierName) {
        this.movementHeader.supplierName = preloadedSupplierName;
      }
      if (preloadedOriginLocationName) {
        this.movementHeader.originLocationName = preloadedOriginLocationName;
      }
      if (preloadedExitReason) {
        this.movementHeader.exitReason = preloadedExitReason;
      }
      if (preloadedReason) {
        this.movementHeader.reason = preloadedReason;
      }

      // Store metadata for later use
      if (metadata) {
        (this as any).preloadedMetadata = metadata;
      }
    }

    // Load catalogs for the form
    this.loadCatalogs();

    // Check for movement type in query params, default to PURCHASE
    this.route.queryParams.subscribe(params => {
      const type = params['type'];

      if(!type)
      {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { type: StockMovementType.PURCHASE },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }

      this.selectedMovementType.set(type);
    });
  }

  /**
   * Load preloaded details from navigation state
   */
  private loadPreloadedDetails(preloadedDetails: any[]): void {
    // Clear existing items (the ones added by resetForm in the effect)
    this.editableItems = [];

    // Get metadata to determine if fields should be read-only
    const metadata = (this as any).preloadedMetadata;
    const isFromReturn = metadata && (metadata.type === 'RETURN' || metadata.type === 'TRANSFER');

    // Determine if this is a RETURN based on the presence of supplier_item_id
    const isReturn = preloadedDetails.some(detail => detail.supplier_item_id);

    // Extract locationId from first detail if available (for RETURN movements)
    if (preloadedDetails.length > 0 && !this.movementHeader.locationId) {
      // For returns, we need to determine the origin location
      // This should ideally come from the goods receipt location
      // For now, we'll let the user select it manually
    }

    // Load preloaded items
    preloadedDetails.forEach((detail: any) => {
      let item: StockItem;

      // Handle both snake_case (from goods-receipts) and camelCase
      const supplyId = detail.supply_id || detail.supplyId;
      const supplyName = detail.supply_name || detail.supplyName;
      const supplierItemId = detail.supplier_item_id || detail.supplierItemId;
      const batchNumber = detail.batch_number || detail.batchNumber;
      const expirationDate = detail.expiration_date || detail.expirationDate;
      const supplierItemName= detail.supplier_item_name || detail.supplierItemName;
      const maxQuantity = detail.quantity || 0; // La cantidad del remito es la máxima que se puede devolver

      if (isReturn && supplierItemId) {
        // For RETURN movements, use supplierItemId
        item = {
          supplyId: Number(supplyId || supplierItemId),
          supplierItemName: supplierItemName || '',
          supplierItemId: Number(supplierItemId),
          quantity: maxQuantity, // Inicializar con la cantidad del remito
          batchNumber: batchNumber || '',
          expirationDate: this.parseExpirationDate(expirationDate),
          notes: detail.notes || '',
          isReadOnly: isFromReturn, // Mark as read-only if coming from return flow
          maxQuantity: maxQuantity // Guardar la cantidad máxima permitida
        };
      } else {
        // For other movements, use supplyId
        item = {
          supplyId: supplyId ? Number(supplyId) : null,
          supplyName: supplyName || '',
          quantity: maxQuantity, // Inicializar con la cantidad del remito
          batchNumber: batchNumber || '',
          expirationDate: this.parseExpirationDate(expirationDate),
          notes: detail.notes || '',
          isReadOnly: isFromReturn, // Mark as read-only if coming from return flow
          maxQuantity: maxQuantity // Guardar la cantidad máxima permitida
        };
      }

      this.editableItems.push(item);
    });

    // If no items were loaded, add an empty one
    if (this.editableItems.length === 0) {
      this.addNewItem();
    }

    // Mark that preloaded details have been processed
    this.pendingPreloadedDetails = null;

    // Disable header fields if details are preloaded
    this.disableHeaderFields = true;

    // Load batches for each item if applicable (RETURN / TRANSFER / ADJUSTMENT)
    const movementType = this.selectedMovementType();
    if (movementType === StockMovementType.RETURN || movementType === StockMovementType.TRANSFER || movementType === StockMovementType.ADJUSTMENT) {
      this.editableItems.forEach((item, idx) => {
        if (item.supplyId) {
          this.onSupplyChange(item.supplyId, idx);
        }
      });
    }

    // Force change detection
    this.cdr.markForCheck();
  }

  /**
   * Converts a string date to a Date object for p-calendar
   */
  private parseExpirationDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Update table columns according to selected movement type
   */
  private updateColumnsForMovementType(type: StockMovementType): void {
    switch (type) {
    case StockMovementType.PURCHASE:
      this.columns = [...this.ingresoColumns];
      break;
    case StockMovementType.TRANSFER:
      this.columns = [...this.transferenciaColumns];
      break;
    case StockMovementType.RETURN:
      this.columns = [...this.salidaColumns];
      break;
    case StockMovementType.ADJUSTMENT:
      this.columns = [...this.ajusteColumns];
      break;
    default:
      this.columns = [...this.ingresoColumns];
    }

    this.cdr.markForCheck();
  }


  /**
   * Handler for PrimeNG tab change events
   * Updates the URL query parameter when user clicks on a tab
   */
  onTabChange(value: string): void {
    // If trying to change to RETURN without permission, show message and prevent
    if (value === StockMovementType.RETURN && !this.canCreateReturn) {
      this.messageService.add({
        severity: 'info',
        summary: 'Información',
        detail: 'Solo se puede ingresar iniciando una devolución desde el apartado de remitos.'
      });
      return;
    }

    if (value !== StockMovementType.RETURN) {
      sessionStorage.removeItem('egreso_access_from_goods_receipts');
      this.canCreateReturn = false;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: value },
      replaceUrl: true
    });
  }

  /**
   * Returns the set of row actions displayed in the generic table for each movement.
   */
  getActionsForMovement = (row: StockMovementTableData): any[] => {
    const actions: any[] = [];

    // Show Edit action for PURCHASE (Entrada) and RETURN (Egreso) movements
    if (row.movementType === StockMovementType.PURCHASE || row.movementType === StockMovementType.RETURN) {
      actions.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.onEditMovement(row)
      });
    }

    return actions;
  };

  /**
   * Navigate to edit movement page
   */
  private onEditMovement(movement: StockMovementTableData): void {
    this.router.navigate(['/procurement-inventory/stock-movements', movement.id, 'edit']);
  }

  /**
   * Applies filter values emitted by the generic table and reloads the listing.
   */
  onFilterChange(event: any): void {
    event.filters.forEach((filter: any) => {
      if (filter.id === 'movementType') {
        this.stockMovementFilters.movementType = filter.value as StockMovementType;
      }
    });
    this.loadStockMovements();
  }

  /**
   * Placeholder for future export capabilities (Excel or PDF).
   * @param filteredData - Filtered data from the table
   * @param event - Export event with type 'excel' or 'pdf'
   */
  onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): void {
    if (event.type === 'excel') {
      this.stockMovementsService.exportStockMovementsToExcel(this.stockMovementFilters).subscribe({
        next: (blob) => {
          const url = (globalThis as any).URL.createObjectURL(blob);
          const link = this.document.createElement('a');
          link.href = url;
          link.download = `movimientos_de_stock_${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          (globalThis as any).URL.revokeObjectURL(url);
        }
      });
    }
  }

  /**
   * Retrieves stock movements from the API and normalizes them for the view.
   */
  private loadStockMovements(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.stockMovementsService.getStockMovements(this.stockMovementFilters).subscribe({
      next: (response: any) => {
        const movements = response.content.map((movement: any) => {
          const movementData = movement as any;

          const movementDate = movementData.movementDate || movementData.movement_date;

          // Extraer ubicaciones
          const originLocation = movementData.originLocation || movementData.origin_location;
          const destinationLocation = movementData.destinationLocation || movementData.destination_location;

          const originName = originLocation?.name || 'Sin información';
          const destinationName = destinationLocation?.name || 'Sin información';


          // El proveedor está en detail.supplierName
          let supplierName = 'Sin proveedor';
          if (movementData.details && movementData.details.length > 0) {
            const firstDetail = movementData.details[0];
            if (firstDetail?.supplierName) {
              supplierName = firstDetail.supplierName;
            }
          }

          // Construir el objeto sin spread para evitar sobrescribir propiedades
          const mapped: StockMovementTableData = {
            id: movementData.id,
            supply: movementData.supply,
            batch: movementData.batch,
            quantity: movementData.quantity,
            movementDate: movementData.movementDate,
            movementType: movementData.movementType,
            originLocation: originLocation,
            destinationLocation: destinationLocation,
            details: movementData.details,
            reason: movementData.reason,
            creationDate: movementDate ? this.formatDate(movementDate) : 'Sin información',
            originName: originName,
            destinationName: destinationName,
            adjustmentReasonLabel: movementData.reason || '',
            supplierName: supplierName,
            movementTypeLabel: this.getMovementTypeLabel(movementData.movementType || movementData.movement_type),
            exitReasonLabel: this.getExitReasonLabel(movementData.exitReason || movementData.exit_reason)
          };

          return mapped;
        });

        this.stockMovements.set(movements);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Parses expiration dates provided either as arrays or ISO strings into a readable format.
   */
  private formatExpirationDate(expirationDate: number[] | string): string {
    try {
      if (Array.isArray(expirationDate)) {
        const [year, month, day] = expirationDate;
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-AR');
      } else {
        return new Date(expirationDate).toLocaleDateString('es-AR');
      }
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Formats an ISO-like string into the locale date representation used in the UI.
   */
  private formatDate(dateString: string): string {
    try {
      const isoString = dateString.replace(' ', 'T');
      const date = new Date(isoString);
      return date.toLocaleDateString('es-AR');
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Produces a localized label for the given movement type value.
   */
  getMovementTypeLabel(type: StockMovementType): string {
    const labels: Record<StockMovementType, string> = {
      [StockMovementType.PURCHASE]: 'Entrada',
      [StockMovementType.TRANSFER]: 'Transferencia',
      [StockMovementType.RETURN]: 'Devolución',
      [StockMovementType.ADJUSTMENT]: 'Ajuste'
    };
    return labels[type] || type;
  }

  /**
   * Gets the localized label for exit reason
   */
  getExitReasonLabel(exitReason?: ExitReason | string): string {
    if (!exitReason) return '-';

    const labels: Record<string, string> = {
      [ExitReason.CONSUMPTION]: 'Consumo interno',
      [ExitReason.SUPPLIER_RETURN]: 'Devolución a proveedor'
    };

    return labels[exitReason] || '-';
  }

  /**
   * Gets the exit reason text based on metadata type
   * Used to display read-only exit reason in RETURN movements from metadata
   */
  getExitReasonTextFromMetadata(): string {
    const metadata = (this as any).preloadedMetadata;
    if (!metadata || !metadata.type) return '';

    if (metadata.type === 'RETURN') {
      return 'Devolución a proveedor';
    } else if (metadata.type === 'TRANSFER') {
      return 'Consumo interno';
    }

    return '';
  }

  /**
   * Checks if the form has preloaded metadata (coming from return flow)
   */
  hasPreloadedMetadata(): boolean {
    const metadata = (this as any).preloadedMetadata;
    return metadata && (metadata.type === 'RETURN' || metadata.type === 'TRANSFER');
  }

  /**
   * Checks if the metadata type is RETURN (for showing supplier field)
   */
  isMetadataTypeReturn(): boolean {
    const metadata = (this as any).preloadedMetadata;
    return metadata && metadata.type === 'RETURN';
  }

  /**
   * Chooses the quantity CSS class depending on whether the stock increases or decreases.
   */
  getQuantityClass(type: string): string {
    if (type === StockMovementType.PURCHASE) {
      return 'text-green-600 font-semibold';
    } else if (type === StockMovementType.TRANSFER || type === StockMovementType.RETURN) {
      return 'text-red-600 font-semibold';
    }
    return 'text-gray-600';
  }

  /**
   * Adds the appropriate sign to quantities according to movement direction.
   */
  getFormattedQuantity(quantity: number, type: StockMovementType): string {
    if (type === StockMovementType.PURCHASE) {
      return `+${quantity}`;
    } else if (type === StockMovementType.TRANSFER || type === StockMovementType.RETURN) {
      return `-${quantity}`;
    }
    return `${quantity}`;
  }

  /**
   * Returns the heading used on the creation panel for the selected movement type.
   */
  private getFormTitle(type: StockMovementType): string {
    const titles: Record<StockMovementType, string> = {
      [StockMovementType.PURCHASE]: 'Ingreso de stock',
      [StockMovementType.TRANSFER]: 'Transferencia de stock',
      [StockMovementType.ADJUSTMENT]: 'Ajuste de inventario',
      [StockMovementType.RETURN]: 'Devolución a proveedor'
    };
    return titles[type] || 'Movimiento de stock';
  }

  /**
   * Clears the creation form and primes a fresh editable row.
   * Preserves preloaded values if they exist.
   */
  private resetForm(): void {
    // Preserve preloaded values
    const preservedSupplierId = this.movementHeader.supplierId;
    const preservedExitReason = this.movementHeader.exitReason;
    const preservedReason = this.movementHeader.reason;

    this.movementHeader = {
      locationId: null,
      originLocationId: null,
      supplierId: preservedSupplierId || null,
      reason: preservedReason || '',
      exitReason: preservedExitReason || ExitReason.SUPPLIER_RETURN // Default value for RETURN movements
    };
    this.editableItems = [];
    this.editingIndex = -1;
    // Re-enable header fields when the form is reset
    this.disableHeaderFields = false;
    this.addNewItem();
  }

  /**
   * Loads supporting catalogs (locations, supplies, suppliers) required by the form.
   */
  private loadCatalogs(): void {
    this.dataLoader.loadAllFormData().subscribe({
      next: (result: any) => {
        this.locations = result.locations;
        this.suppliers = result.suppliers;
        this.supplies = result.supplies;
        this.filteredSupplies = [...result.supplies]; // Initialize filtered supplies

        // Check if we need to load stock locations before processing preloaded details
        const needsStockLocations = this.pendingPreloadedDetails &&
          (this.selectedMovementType() === StockMovementType.RETURN ||
           this.selectedMovementType() === StockMovementType.TRANSFER ||
           this.selectedMovementType() === StockMovementType.ADJUSTMENT);

        if (needsStockLocations) {
          // Load stock locations first, then process preloaded details
          this.loadStockLocations();
          setTimeout(() => {
            if (this.pendingPreloadedDetails) {
              this.loadPreloadedDetails(this.pendingPreloadedDetails!);
            }
          }, 200); // Slightly longer delay to ensure stock locations are loaded
        } else if (this.pendingPreloadedDetails) {
          // No stock locations needed, process immediately
          setTimeout(() => {
            if (this.pendingPreloadedDetails) {
              this.loadPreloadedDetails(this.pendingPreloadedDetails!);
            }
          }, 100);
        }

        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        this.showError('Error al cargar los datos del formulario');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load stock locations with their supplies and batches
   * Used for TRANSFER and ADJUSTMENT movements to filter supplies and batches by location
   */
  private loadStockLocations(): void {
    this.stockLocationsService.getStockLocations().subscribe({
      next: (stockLocations: StockLocationDTO[]) => {
        this.stockLocations = stockLocations;
        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        this.cdr.markForCheck();
      }
    });
  }

  /**

  /**
   * Handle supplier change for PURCHASE movements
   * Loads supplies that the selected supplier provides
   */
  onSupplierChange(supplierId: number | null): void {
    if (!supplierId || this.selectedMovementType() !== StockMovementType.PURCHASE) {
      this.filteredSupplies = [...this.supplies];
      return;
    }

    // Load supplies for the selected supplier
    this.supplierItemsService.getSuppliesBySupplierId(supplierId).subscribe({
      next: (items: ResponseSupplierItemsBySupplierIdDTO[]) => {
        // Map supplier items to supply format for the dropdown
        this.filteredSupplies = items.map(item => ({
          id: item.supplyId,
          name: item.supply.name
        }));

        // Don't clear items if they're already populated (preloaded data)
        // Only validate that the supplies exist in the new filtered list
        this.editableItems.forEach(item => {
          if (item.supplyId) {
            const supplyExists = this.filteredSupplies.some(s => s.id === item.supplyId);
            if (!supplyExists) {
              // Clear this item's supply if it doesn't match the new supplier
              item.supplyId = null;
              item.batchNumber = undefined;
              item.expirationDate = undefined;
            }
          }
        });

        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        this.filteredSupplies = [];
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle origin location change for TRANSFER movements
   * Filters supplies that have stock in the selected origin location
   */
  onOriginLocationChange(locationId: number | null): void {
    if (!locationId || this.selectedMovementType() !== StockMovementType.TRANSFER) {
      this.filteredSupplies = [...this.supplies];
      return;
    }

    // Find the selected location in stockLocations
    this.selectedLocation.set(this.stockLocations.find(loc => loc.id === locationId) ?? {});

    if (!this.selectedLocation() || !this.selectedLocation().supplies || this.selectedLocation().supplies?.length === 0) {
      // No supplies available in this location
      this.filteredSupplies = [];
    } else {
      this.filteredSupplies = this.selectedLocation().supplies?.map(({ supplyId, supplyName }) => ({ id: supplyId, name:supplyName })) ?? [];
    }

    // Instead of clearing, reload batches for existing items
    this.editableItems.forEach((item, index) => {
      if (item.supplyId) {
        // Reload batches for this supply in the new location
        this.onSupplyChange(item.supplyId, index);
      }
    });

    this.cdr.markForCheck();
  }

  /**
   * Handle location change for ADJUSTMENT movements
   * Filters supplies that have stock in the selected location
   */
  onAdjustmentLocationChange(locationId: number | null): void {
    if (!locationId || this.selectedMovementType() !== StockMovementType.ADJUSTMENT) {
      this.filteredSupplies = [...this.supplies];
      return;
    }

    // Find the selected location in stockLocations
    this.selectedLocation.set(this.stockLocations.find(loc => loc.id === locationId) ?? {});

    if (!this.selectedLocation() || !this.selectedLocation().supplies || this.selectedLocation().supplies?.length === 0) {
      // No supplies available in this location
      this.filteredSupplies = [];
    } else {
      this.filteredSupplies = this.selectedLocation().supplies?.map(({ supplyId, supplyName }) => ({ id: supplyId, name:supplyName })) ?? [];
    }

    // Instead of clearing, reload batches for existing items
    this.editableItems.forEach((item, index) => {
      if (item.supplyId) {
        // Reload batches for this supply in the new location
        this.onSupplyChange(item.supplyId, index);
      }
    });

    this.cdr.markForCheck();
  }

  /**
   * Handle location change for RETURN movements
   * Filters supplies that have stock in the selected origin location
   */
  onReturnLocationChange(locationId: number | null): void {
    if (!locationId || this.selectedMovementType() !== StockMovementType.RETURN) {
      this.filteredSupplies = [...this.supplies];
      return;
    }

    // Find the selected location in stockLocations
    this.selectedLocation.set(this.stockLocations.find(loc => loc.id === locationId) ?? {});

    if (!this.selectedLocation() || !this.selectedLocation().supplies || this.selectedLocation().supplies?.length === 0) {
      // No supplies available in this location
      this.filteredSupplies = [];
    } else {
      this.filteredSupplies = this.selectedLocation().supplies?.map(({ supplyId, supplyName }) => ({ id: supplyId, name:supplyName })) ?? [];
    }

    // Instead of clearing, reload batches for existing items
    this.editableItems.forEach((item, index) => {
      if (item.supplyId) {
        // Reload batches for this supply in the new location
        this.onSupplyChange(item.supplyId, index);
      }
    });

    this.cdr.markForCheck();
  }

  /**
   * Load available batches for a specific supply
   * @param supplyId ID of the selected supply
   * @param itemIndex Index of the item in editableItems array
   */
  onSupplyChange(supplyId: number | null, itemIndex: number): void {

    if (!supplyId) {
      this.editableItems[itemIndex].availableBatches = [];
      this.editableItems[itemIndex].batchId = null;
      this.editableItems[itemIndex].batchNumber = undefined;
      this.cdr.markForCheck();
      return;
    }

    // Only load batches for TRANSFER, ADJUSTMENT, and RETURN movements
    const movementType = this.selectedMovementType();
    if (movementType !== StockMovementType.TRANSFER && movementType !== StockMovementType.ADJUSTMENT && movementType !== StockMovementType.RETURN) {
      return;
    }

    // For TRANSFER, use originLocationId; for ADJUSTMENT and RETURN, use locationId
    const locationId = movementType === StockMovementType.TRANSFER
      ? this.movementHeader.originLocationId
      : this.movementHeader.locationId;

    if (!locationId) {
      this.editableItems[itemIndex].availableBatches = [];
      this.cdr.markForCheck();
      return;
    }

    // Find the location in stockLocations
    const selectedLocation = this.stockLocations.find(loc => loc.id === locationId);

    if (!selectedLocation) {
      this.editableItems[itemIndex].availableBatches = [];
      this.cdr.markForCheck();
      return;
    }

    // Find the supply in the location's supplies
    const supplyInLocation = selectedLocation.supplies.find(s => s.supplyId === supplyId);

    if (!supplyInLocation || !supplyInLocation.batches || supplyInLocation.batches.length === 0) {
      this.editableItems[itemIndex].availableBatches = [];
      this.editableItems[itemIndex].maxQuantity = undefined;
      this.cdr.markForCheck();
      return;
    }


    // Calculate total available quantity for this supply in the origin location
    // Sum all batches with quantity > 0
    const totalAvailableQuantity = supplyInLocation.batches
      .filter(batch => batch.quantity > 0)
      .reduce((sum, batch) => sum + Number(batch.quantity), 0);

    // Set max quantity for this item (for validation purposes)
    this.editableItems[itemIndex].maxQuantity = totalAvailableQuantity;

    // Do NOT auto-set quantity - user must enter it manually to avoid accidental transfers

    // Convert StockLocationBatchDTO to ResponseBatchDTO format
    // Note: We're using partial data since StockLocationBatchDTO doesn't include all fields
    const availableBatches = supplyInLocation.batches
      .filter(batch => batch.quantity > 0)
      .map(batch => ({
        id: batch.batchId,
        supplyId: supplyId,
        supplyName: supplyInLocation.supplyName,
        supplierId: 0, // Not available in StockLocationBatchDTO
        supplierName: '', // Not available in StockLocationBatchDTO
        batchCode: batch.batchNumber,
        manufacturingDate: '', // Not available in StockLocationBatchDTO
        expirationDate: batch.expirationDate,
        initialQuantity: batch.quantity,
        status: 'Activo' as any,
        isActive: true,
        created_date_time: batch.createdDatetime,
        created_user: 0,
        last_updated_date_time: batch.lastUpdatedDatetime,
        last_updated_user: 0
      } as ResponseBatchDTO));

    this.editableItems[itemIndex].availableBatches = availableBatches;

    // Auto-select the batch if the item has a preloaded batchNumber
    const item = this.editableItems[itemIndex];
    if (item.batchNumber && item.availableBatches && item.availableBatches.length) {
      const match = item.availableBatches.find(b => b.batchCode === item.batchNumber);
      if (match) {
        item.batchId = match.id;
        item.expirationDate = this.parseDateFromBackend(match.expirationDate);
        // maxQuantity is set before (total or from batch); here we use the available quantity from the batch
        item.maxQuantity = Number(match.initialQuantity);
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Handle batch selection change
   * @param batchId Selected batch ID
   * @param itemIndex Index of the item in editableItems array
   */
  onBatchChange(batchId: number | null, itemIndex: number): void {

    if (!batchId) {
      this.editableItems[itemIndex].batchNumber = undefined;
      this.editableItems[itemIndex].expirationDate = undefined;
      this.editableItems[itemIndex].maxQuantity = undefined;
      return;
    }

    const selectedBatch = this.editableItems[itemIndex].availableBatches?.find(b => b.id === batchId);

    if (selectedBatch) {
      this.editableItems[itemIndex].batchNumber = selectedBatch.batchCode;
      // Convertir la fecha del lote a objeto Date para el calendar
      const parsedDate = this.parseDateFromBackend(selectedBatch.expirationDate);


      this.editableItems[itemIndex].expirationDate = parsedDate;

      // Set max quantity to the available quantity of this specific batch
      // initialQuantity contains the available quantity for this batch at the origin location
      this.editableItems[itemIndex].maxQuantity = Number(selectedBatch.initialQuantity);

      this.cdr.markForCheck();
    }
  }

  /**
   * Parse date from backend format (string YYYY-MM-DD) to Date object
   */
  private parseDateFromBackend(dateString: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      return new Date(year, month - 1, day);
    } catch {
      return undefined;
    }
  }

  /**
   * Add new item to grid
   */
  addNewItem(): void {
    const newItem: StockItem = {
      supplyId: null,
      quantity: '',
      batchNumber: '',
      batchId: null,
      expirationDate: undefined,
      notes: '',
      availableBatches: [],
      maxQuantity: undefined
    };

    this.editableItems.push(newItem);
    this.editingIndex = this.editableItems.length - 1;

    // Focus on first field of new item after small delay
    setTimeout(() => {
      this.focusCell(this.editableItems.length - 1, 'supplyId');
    }, 50);

    this.cdr.markForCheck();
  }

  /**
   * Removes an item from the detail grid.
   */
  deleteItem(index: number): void {
    this.editableItems.splice(index, 1);

    // Reset editingIndex if deleting current editing item
    if (this.editingIndex === index) {
      this.editingIndex = -1;
    } else if (this.editingIndex > index) {
      this.editingIndex--;
    }
    this.cdr.markForCheck();
  }

  /**
   * Tracks the currently focused row within the editable grid.
   */
  onCellFocus(rowIndex: number, _colName: string): void {
    this.editingIndex = rowIndex;
  }

  /**
   * Determines if the supply dropdown should be disabled
   * For PURCHASE: requires supplierId
   * For TRANSFER: requires originLocationId
   * For ADJUSTMENT: requires locationId
   */
  isSupplyDropdownDisabled(): boolean {
    const movementType = this.selectedMovementType();
    if (movementType === StockMovementType.PURCHASE) {
      return !this.movementHeader.supplierId || this.disableHeaderFields;
    }
    if (movementType === StockMovementType.TRANSFER) {
      return !this.movementHeader.originLocationId || this.disableHeaderFields;
    }
    if (movementType === StockMovementType.ADJUSTMENT) {
      return !this.movementHeader.locationId || this.disableHeaderFields;
    }
    if (movementType === StockMovementType.RETURN) {
      // Location is no longer required to select a product for RETURN movements
      return this.disableHeaderFields; // only disabled if the header is locked by preloading
    }
    return false;
  }

  /**
   * Gets the appropriate placeholder text for the supply dropdown
   */
  getSupplyPlaceholder(): string {
    const movementType = this.selectedMovementType();

    if (movementType === StockMovementType.PURCHASE && !this.movementHeader.supplierId) {
      return 'Primero seleccione proveedor';
    }

    if (movementType === StockMovementType.TRANSFER && !this.movementHeader.originLocationId) {
      return 'Primero seleccione ubicación origen';
    }

    if (movementType === StockMovementType.ADJUSTMENT && !this.movementHeader.locationId) {
      return 'Primero seleccione ubicación destino';
    }

    if (movementType === StockMovementType.RETURN && !this.movementHeader.locationId) {
      return 'Primero seleccione ubicación origen';
    }

    return 'Seleccionar producto';
  }

  /**
   * Gets the name of the selected supply for tooltip
   */
  getSelectedSupplyName(supplyId: number | null): string {
    if (!supplyId) return '';
    const supply = this.getSupplyOptions().find(s => s.id === supplyId);
    return supply ? supply.name : '';
  }

  /**
   * Gets a readable label for location type
   */
  getLocationTypeLabel(locationType: string | undefined): string {
    if (!locationType) return '-';
    const typeMap: Record<string, string> = {
      'SHELF': 'Estantería',
      'WAREHOUSE': 'Almacén',
      'LABORATORY': 'Laboratorio'
    };
    return typeMap[locationType.toUpperCase()] || locationType;
  }

  /**
   * Gets the appropriate options for the supply dropdown based on movement type
   */
  getSupplyOptions(): any[] {
    const movementType = this.selectedMovementType();
    if (movementType === StockMovementType.RETURN) {
      // Allow products even if no location is selected (this validation was requested to be removed)
      return this.filteredSupplies.length ? this.filteredSupplies : this.supplies;
    }

    // For PURCHASE movements, use filteredSupplies if supplier is selected
    if (movementType === StockMovementType.PURCHASE) {
      return this.movementHeader.supplierId ? this.filteredSupplies : this.supplies;
    }

    // For TRANSFER movements, use filteredSupplies if origin location is selected
    if (movementType === StockMovementType.TRANSFER) {
      return this.movementHeader.originLocationId ? this.filteredSupplies : this.supplies;
    }

    // For ADJUSTMENT movements, use filteredSupplies if location is selected
    if (movementType === StockMovementType.ADJUSTMENT) {
      return this.movementHeader.locationId ? this.filteredSupplies : this.supplies;
    }

    // Default: all supplies
    return this.supplies;
  }

  /**
   * Gets available supply options for a specific item index
   * Filters out supplies already selected in other items
   */
  getAvailableSupplyOptions(itemIndex: number): any[] {
    const allOptions = this.getSupplyOptions();

    // Get all selected supply IDs except for the current item
    const selectedSupplyIds = this.editableItems
      .map((item, index) => index !== itemIndex ? item.supplyId : null)
      .filter(id => id !== null);

    // Filter out already selected supplies
    return allOptions.filter(option => !selectedSupplyIds.includes(option.id));
  }

  /**
   * Validates and adjusts quantity when user leaves the input field (blur)
   *
   * For TRANSFER and RETURN movements:
   * - Ensures quantity doesn't exceed maxQuantity (available stock)
   * - Minimum value is 1
   *
   * For ADJUSTMENT movements:
   * - Positive values (increments): No upper limit
   * - Negative values (decrements): Validates that stock won't go negative
   * - Allows 0 for no adjustment
   */
  onQuantityChange(itemIndex: number): void {
    const item = this.editableItems[itemIndex];
    const movementType = this.selectedMovementType();

    // Only validate for TRANSFER, RETURN, and ADJUSTMENT movements with maxQuantity set
    if ((movementType !== StockMovementType.TRANSFER && movementType !== StockMovementType.RETURN && movementType !== StockMovementType.ADJUSTMENT) || item.maxQuantity === undefined) {
      return;
    }

    // Convert quantity to number if it's a string
    const quantityNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;

    // Ensure quantity is a valid number
    if (quantityNum === null || quantityNum === undefined || isNaN(quantityNum)) {
      item.quantity = '';
      return;
    }

    // TRANSFER and RETURN: Cap at maxQuantity and ensure minimum of 1
    if (movementType === StockMovementType.TRANSFER || movementType === StockMovementType.RETURN) {
      if (quantityNum > item.maxQuantity) {
        item.quantity = item.maxQuantity;
      }
      if (quantityNum < 1) {
        item.quantity = 1;
      }
    }

    // ADJUSTMENT: Different logic for positive and negative adjustments
    if (movementType === StockMovementType.ADJUSTMENT) {
      // Negative adjustment: validate that stock won't go negative
      if (quantityNum < 0) {
        const absoluteValue = Math.abs(quantityNum);
        if (absoluteValue > item.maxQuantity) {
          // Can't remove more than what exists
          item.quantity = -item.maxQuantity;
        }
      }
      // Positive adjustment: No upper limit (can add as much as needed)
      // Zero is allowed (no adjustment)
    }

    this.cdr.markForCheck();
  }

  /**
   * Handles keyboard navigation and validation while editing detail rows.
   */
  onKeyDown(event: any, rowIndex: number, colName: string): void {
    // Prevent negative numbers for all movement types EXCEPT ADJUSTMENT
    const movementType = this.selectedMovementType();
    if (colName === 'quantity' &&
        movementType !== StockMovementType.ADJUSTMENT &&
        (event.key === '-' || event.key === 'Minus' || event.key === 'Subtract')) {
      event.preventDefault();
      return;
    }

    const columns = ['supplyId', 'quantity', 'batchNumber', 'expirationDate', 'notes'];
    const currentColIndex = columns.indexOf(colName);

    switch (event.key) {
    case 'Enter':
      event.preventDefault();

      // If on last column, add new row
      if (currentColIndex === columns.length - 1) {
        this.addNewItem();
      } else {
        this.focusCell(rowIndex, columns[currentColIndex + 1]);
      }
      break;
    case 'ArrowRight':
      if (currentColIndex < columns.length - 1) {
        event.preventDefault();
        this.focusCell(rowIndex, columns[currentColIndex + 1]);
      }
      break;
    case 'ArrowLeft':
      if (currentColIndex > 0) {
        event.preventDefault();
        this.focusCell(rowIndex, columns[currentColIndex - 1]);
      }
      break;
    case 'Tab':
      if (!event.shiftKey && currentColIndex === columns.length - 1) {
        event.preventDefault();
        this.addNewItem();
      }
      break;
    }
  }

  /**
   * Moves focus to a specific cell within the editable grid.
   */
  private focusCell(rowIndex: number, colName: string): void {
    setTimeout(() => {
      const selector = `[data-row="${rowIndex}"][data-col="${colName}"]`;
      const element = this.document.querySelector(selector) as any;
      if (element) {
        element.focus();
      }
    }, 50);
  }

  /**
   * Validates and submits the movement creation form using the selected strategy.
   */
  save(): void {
    // Check if this is a return movement from goods-receipts with metadata
    const metadata = (this as any).preloadedMetadata;
    const deliveryNoteId = (globalThis as any).history?.state?.['id'];

    // If metadata.type exists (RETURN or TRANSFER), handle as merchandise return
    if (metadata && metadata.type && deliveryNoteId) {
      this.handleReturnMovement(metadata.type, deliveryNoteId);
      return;
    }

    // Normal flow: continue with existing logic
    const strategy = this.strategyService.getStrategy(this.selectedMovementType());

    // Validate required field: reason
    if (!this.movementHeader.reason || this.movementHeader.reason.trim() === '') {
      this.showError('El campo "Motivo" es obligatorio');
      return;
    }

    // Additional validation for TRANSFER and RETURN movements: check quantities don't exceed maxQuantity
    const movementType = this.selectedMovementType();
    if (movementType === StockMovementType.TRANSFER || movementType === StockMovementType.RETURN) {
      const invalidItems = this.editableItems.filter(item => {
        const quantityNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        return item.maxQuantity !== undefined && quantityNum > item.maxQuantity;
      });

      if (invalidItems.length > 0) {
        this.showError('Una o más cantidades exceden el stock disponible');
        return;
      }
    }

    // Additional validation for ADJUSTMENT movements: check negative adjustments don't exceed available stock
    if (movementType === StockMovementType.ADJUSTMENT) {
      const invalidItems = this.editableItems.filter((item: StockItem) => {
        if (item.maxQuantity === undefined) return false;
        const quantityNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        // Only validate negative adjustments (decrements)
        if (quantityNum < 0) {
          const absoluteValue = Math.abs(quantityNum);
          return absoluteValue > item.maxQuantity;
        }
        return false;
      });

      if (invalidItems.length > 0) {
        this.showError('No se puede decrementar más stock del disponible');
        return;
      }
    }

    // Build form data
    const formData = this.buildFormData();

    // Validate
    const validation = strategy.validate(formData);
    if (!validation.valid) {
      this.showError(validation.message || 'Error de validación');
      return;
    }

    const userId = this.getCurrentUserId();
    const payload = strategy.buildPayload(formData, userId);

    this.saving = true;
    this.cdr.markForCheck();

    strategy.submit(payload).subscribe({
      next: (_response: any) => {
        this.saving = false;
        this.showSuccess('Movimiento guardado exitosamente');

        // Clear session storage flag if it was a RETURN movement from goods-receipts
        if (movementType === StockMovementType.RETURN) {
          sessionStorage.removeItem('egreso_access_from_goods_receipts');
        }

        this.resetForm();
        this.loadStockMovements();

        // Reload stock locations after TRANSFER, ADJUSTMENT or RETURN to reflect changes immediately
        if (movementType === StockMovementType.TRANSFER || movementType === StockMovementType.ADJUSTMENT || movementType === StockMovementType.RETURN) {
          this.loadStockLocations();
        }

        this.cdr.markForCheck();
      },
      error: (_error: any) => {
        this.saving = false;
        this.showError('Error al guardar el movimiento');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Builds the payload consumed by the stock movement creation strategy.
   */
  private buildFormData(): any {
    const movementType = this.selectedMovementType();

    return {
      ...this.movementHeader,
      details: this.editableItems.map(item => {
        const detail: any = {
          quantity: item.quantity,
          batchNumber: item.batchNumber,
          expirationDate: this.formatDateForBackend(item.expirationDate),
          notes: item.notes
        };

        // Para RETURN movements, enviar supplierItemName en lugar de supplyName
        if (movementType === StockMovementType.RETURN) {
          detail.supplierItemId = item.supplierItemId;
          detail.supplierItemName = item.supplierItemName;
        } else {
          detail.supplyId = item.supplyId;
        }

        return detail;
      })
    };
  }


  /**
   * Converts a Date object or string to the backend expected format (YYYY-MM-DD)
   */
  private formatDateForBackend(date: string | Date | undefined): string | undefined {
    if (!date) return undefined;

    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return date;
  }

  /**
   * Cancels the current edition and reinitializes the form.
   * If navigation came from goods-receipts, returns to previous page.
   */
  onFormCancel(): void {
    // Clear session storage flag
    sessionStorage.removeItem('egreso_access_from_goods_receipts');

    // Check if we came from goods-receipts (RETURN type with canCreateReturn flag)
    const currentType = this.selectedMovementType();

    if (currentType === StockMovementType.RETURN && this.canCreateReturn) {
      // Navigate back to goods-receipts using browser history
      this.location.back();
    } else {
      // Default behavior: reset form
      this.resetForm();
    }
  }

  /**
   * Retrieves the current user identifier from the authentication service when available.
   */
  private getCurrentUserId(): number {
    try {
      const user = (this as any).authService?.getUser?.();
      return user?.id ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Toggle form section
   */
  toggleFormSection(): void {
    this.formSectionCollapsed = !this.formSectionCollapsed;
    this.cdr.markForCheck();
  }

  /**
   * Toggle history section
   */
  toggleHistorySection(): void {
    this.historySectionCollapsed = !this.historySectionCollapsed;
    this.cdr.markForCheck();
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
   * Handles merchandise return to supplier or internal return
   * Called when metadata.type is present (RETURN or TRANSFER)
   */
  private handleReturnMovement(type: 'RETURN' | 'TRANSFER', deliveryNoteId: number): void {
    // Validate required field: reason
    if (!this.movementHeader.reason || this.movementHeader.reason.trim() === '') {
      this.showError('El campo "Motivo" es obligatorio');
      return;
    }

    // Validate that there are items to return
    if (!this.editableItems || this.editableItems.length === 0) {
      this.showError('Debe seleccionar al menos un producto para devolver');
      return;
    }

    // Build the DTO for return
    const userId = this.getCurrentUserId();

    const returnDto = {
      reason: this.movementHeader.reason.trim(),
      userId: userId.toString(),
      returnDetails: this.editableItems.map(item => {
        // Get detail_id from preloadedDetails (stored when navigation happened)
        const navigationState = (globalThis as any).history?.state;
        const preloadedDetails = navigationState?.['preloadedDetails'] || [];

        // Find the matching preloaded detail by supply_id or supplier_item_id
        const matchingDetail = preloadedDetails.find((pd: any) => {
          const pdSupplyId = pd.supply_id || pd.supplyId;
          const pdSupplierItemId = pd.supplier_item_id || pd.supplierItemId;

          if (type === 'RETURN') {
            return pdSupplierItemId && pdSupplierItemId === item.supplierItemId;
          } else {
            return pdSupplyId && pdSupplyId === item.supplyId;
          }
        });

        const detailId = matchingDetail?.detail_id || matchingDetail?.id;

        const quantityNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;

        return {
          deliveryNoteDetailId: detailId,
          quantityToReturn: quantityNum
        };
      }).filter(detail => detail.deliveryNoteDetailId) // Solo incluir detalles con ID válido
    };

    // Validate that we have at least one valid detail
    if (returnDto.returnDetails.length === 0) {
      this.showError('No se pudieron procesar los detalles de devolución');
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Call the appropriate service method based on type
    const returnObservable = type === 'RETURN'
      ? this.goodsReceiptsService.returnMerchandise(deliveryNoteId, returnDto)
      : this.goodsReceiptsService.returnInternalDeliveryNote(deliveryNoteId, returnDto);

    returnObservable.subscribe({
      next: (_response: any) => {
        this.saving = false;
        const successMessage = type === 'RETURN'
          ? 'Devolución a proveedor registrada exitosamente'
          : 'Devolución interna registrada exitosamente';

        this.showSuccess(successMessage);

        // Clear preloaded metadata
        delete (this as any).preloadedMetadata;

        // Navigate back to goods receipts
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/goods-receipts']);
        }, 1500);
      },
      error: (error: any) => {
        this.saving = false;
        const errorMessage = error?.error?.message || 'Error al registrar la devolución';
        this.showError(errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cleanup on component destruction
   * Clear the egreso access flag from sessionStorage
   */
  ngOnDestroy(): void {
    sessionStorage.removeItem('egreso_access_from_goods_receipts');
    this.tutorialSub?.unsubscribe();
  }
}
