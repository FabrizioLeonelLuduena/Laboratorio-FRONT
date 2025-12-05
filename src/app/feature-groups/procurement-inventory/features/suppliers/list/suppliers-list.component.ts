import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  ViewChild,
  TemplateRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import {
  GenericAlertComponent,
  AlertType
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from 'src/app/shared/services/export';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { ResponseSupplierItemsBySupplierIdDTO } from '../../../models/supplier-items/supplier-items.model';
import {
  ResponseSupplierDTO,
  SupplierFiltersDTO,
  ValidationConstants
} from '../../../models/suppliers/suppliers.model';
import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { SuppliersService } from '../../../services/suppliers.service';

import { SUPPLIER_EXPORT_COLUMNS, SUPPLIER_PDF_COLUMNS, SupplierDisplayRow } from './suppliers-export-config';

/**
 * Suppliers list component with pagination, filtering, and expandable rows
 *
 * Features:
 * - Displays suppliers in paginated table with expandable detail rows
 * - Shows supplier items (products) with prices in expanded rows
 * - Active/Inactive status filtering
 * - Deactivation with mandatory reason
 * - Edit action (only for active suppliers)
 * - Excel/PDF export functionality
 */
@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    GenericTableComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    TutorialOverlayComponent
  ],
  templateUrl: './suppliers-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Tutorial overlay reference
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;
  @ViewChild('unitPriceTemplate', { static: false }) unitPriceTemplate!: TemplateRef<any>;

  // Column templates map for custom rendering
  columnTemplates = new Map<string, TemplateRef<any>>();

  // Reactive data using signals
  suppliers = signal<ResponseSupplierDTO[]>([]);
  allSuppliers: ResponseSupplierDTO[] = [];
  loading = false;

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        // Special selector to highlight table header + first data row
        target: 'app-generic-table:table-intro',
        title: 'Gestión de proveedores',
        message: 'Aquí puedes gestionar todos los proveedores del laboratorio. Visualiza CUIT, razón social, contactos y el estado de cada proveedor.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para alternar entre proveedores activos e inactivos.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar proveedores de forma rapida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de proveedores a formato Excel para análisis externo o reportes.',
        position: 'bottom',
        onEnter: () => {
          // Close the expanded row that was opened in step 1
          // This leaves the UI clean
          if (this.genericTable && this.suppliers().length > 0) {
            const firstRow = this.suppliers()[0];
            const key = firstRow.id;
            this.genericTable.expandedRowKeys[key] = false;
          }
        }
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nuevo proveedor',
        message: 'Haz clic aquí para registrar un nuevo proveedor en el sistema.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada proveedor.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes editar o desactivar proveedores. Solo los proveedores activos pueden ser editados.',
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

      this.showSuccess('Tutorial completado! Ya conoces todas las funcionalidades de gestión de proveedores.');
    },
    onSkip: () => {
      // Tutorial skipped by user
    }
  });

  /**
   * Subscription to the global TutorialService trigger stream.
   */
  private tutorialSub?: Subscription;

  supplierFilters: SupplierFiltersDTO = {
    page: 0,
    size: ValidationConstants.DEFAULT_PAGE_SIZE,
    sort: 'id,desc',
    isActive: true
  };

  filters: Filter[] = [
    {
      id: 'is_active',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Activos', value: true, active: true },
        { label: 'Inactivos', value: false }
      ]
    }
  ];

  // Column configuration for GenericTableComponent
  columns = [
    { field: 'cuit', header: 'CUIT', sortable: true },
    { field: 'companyName', header: 'Razón social', sortable: true },
    { field: 'contact', header: 'Contacto', sortable: false },
    { field: 'emailOrPhone', header: 'Email/Teléfono', sortable: false },
    { field: 'isActive', header: 'Estado', sortable: true }
  ];

  // Help content (displayed in Spanish for end users)
  helpContent = `
    <div style="line-height: 1.6;">
      <p><strong>Bienvenido a la Gestión de Proveedores</strong></p>
      <p>Desde esta pantalla podés administrar todos los proveedores del laboratorio.</p>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Acciones disponibles:</h4>
      <ul style="margin-left: 20px;">
        <li><i class="pi pi-plus" style="color: #10b981;"></i> <strong>Agregar:</strong> Crea un nuevo proveedor</li>
        <li><i class="pi pi-angle-down" style="color: #3b82f6;"></i> <strong>Expandir:</strong> Despliega la fila para ver los productos del proveedor</li>
        <li><i class="pi pi-pencil" style="color: #f59e0b;"></i> <strong>Editar:</strong> Modifica la información (solo activos)</li>
        <li><i class="pi pi-ban" style="color: #ef4444;"></i> <strong>Desactivar:</strong> Deshabilita un proveedor (acción irreversible)</li>
      </ul>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Filtros:</h4>
      <p>Usá el botón <i class="pi pi-filter"></i> para filtrar por estado (Activos/Inactivos/Todos).</p>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Búsqueda:</h4>
      <p>Usá la barra de búsqueda para encontrar proveedores por nombre o CUIT.</p>

      <h4 style="margin-top: 16px; margin-bottom: 8px;">Productos del proveedor:</h4>
      <p>Expandí la fila para ver los productos que ofrece cada proveedor con sus precios y presentaciones.</p>
    </div>
  `;

  /**
   * Gets available actions for a supplier based on its status.
   *
   * IMPORTANT: Each `command` captures the current `row` via closure,
   * allowing GenericTableComponent command execution to access the correct
   * supplier without needing to pass parameters.
   *
   * @param row - Supplier DTO from table row
   * @returns Array of menu items with actions
   */
  getActionsForSupplier = (row: ResponseSupplierDTO): MenuItem[] => {
    // Capture current supplier in function scope
    const supplier = row;

    const baseActions: MenuItem[] = [];

    // Only active suppliers can be edited or deactivated
    if (supplier.isActive) {
      baseActions.push({
        id: 'edit',
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          this.editSupplier(supplier);
        }
      });
      baseActions.push({
        id: 'deactivate',
        label: 'Desactivar',
        icon: 'pi pi-ban',
        command: () => {
          this.deactivateSupplier(supplier);
        }
      });
    } else {
      // Inactive suppliers can only be reactivated
      baseActions.push({
        id: 'reactivate',
        label: 'Reactivar',
        icon: 'pi pi-check',
        command: () => {
          this.reactivateSupplier(supplier);
        }
      });
    }

    return baseActions;
  };

  // Alert properties
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  // Deactivation modal properties
  showDeactivationModal = false;
  deactivationReason = '';
  deactivationReasonError = '';
  supplierToDeactivate: ResponseSupplierDTO | null = null;

  // Supplier items cache
  supplierItemsMap: Map<number, ResponseSupplierItemsBySupplierIdDTO[]> = new Map();
  loadingItemsMap: Map<number, boolean> = new Map();

  // Reactivation modal properties
  showReactivationModal = false;
  supplierToReactivate: ResponseSupplierDTO | null = null;

  private suppliersService = inject(SuppliersService);
  private supplierItemsService = inject(SupplierItemsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private tutorialService = inject(TutorialService);

  /**
   * Component initialization
   * Sets up breadcrumb and loads active suppliers by default
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario > Proveedores', '/procurement-inventory/suppliers');
    this.loadSuppliers();

    // Subscribe to tutorial trigger
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      // Check if the triggered route matches this component's route
      if (!route.includes('suppliers')) return;

      setTimeout(() => {
        if (this.tutorialOverlay) {
          this.tutorialOverlay.start();
        }
      }, 100);
    });
  }

  /**
   * After view initialization
   */
  ngAfterViewInit(): void {
    // Assign template to unitPrice column for right alignment
    const unitPriceColumn = this.supplierItemColumns.find(col => col.field === 'unitPrice');
    if (unitPriceColumn && this.unitPriceTemplate) {
      (unitPriceColumn as any).template = this.unitPriceTemplate;
      delete (unitPriceColumn as any).pipes;
    }
    this.cdr.markForCheck();
  }

  /**
   * Column definitions for the supplier items table inside the expanded row
   */
  supplierItemColumns = [
    {
      field: 'supplyName',
      header: 'Producto',
      sortable: true
    },
    {
      field: 'packagingDescription',
      header: 'Empaque',
      sortable: false
    },
    {
      field: 'description',
      header: 'Descripción',
      sortable: false
    },
    {
      field: 'unitPrice',
      header: 'Precio unitario',
      sortable: true,
      pipes: [
        { name: 'currency', args: ['ARS', 'symbol', '1.2-2', 'es-AR'] }
      ]
    }
  ];

  /**
   * Ensures supplier items are loaded for a given supplier
   * @param supplierId - The supplier ID
   * @returns true to allow template rendering
   */
  ensureSupplierItemsLoaded(supplierId: number): boolean {
    if (!supplierId) return true;
    if (this.supplierItemsMap.has(supplierId) || this.loadingItemsMap.get(supplierId)) return true;
    this.loadSupplierItems(supplierId);
    return true;
  }

  /**
   * Loads supplier items for a specific supplier
   * @param supplierId - The supplier ID
   */
  private loadSupplierItems(supplierId: number): void {
    this.loadingItemsMap.set(supplierId, true);
    this.supplierItemsService.getSuppliesBySupplierId(supplierId).subscribe({
      next: (items) => {
        this.supplierItemsMap.set(supplierId, items);
        this.loadingItemsMap.set(supplierId, false);
        this.cdr.markForCheck();
      },
      error: (_error) => {
        this.supplierItemsMap.set(supplierId, []);
        this.loadingItemsMap.set(supplierId, false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Gets the transformed supplier items for display in the generic table
   * @param supplierId - The supplier ID
   * @returns Array of supplier items with fields matching the column definitions
   */
  getSupplierItemsForTable(supplierId: number): any[] {
    const items = this.supplierItemsMap.get(supplierId) || [];
    return items.map(item => ({
      description: item.description || 'N/A',
      supplyName: item.supply?.name || 'N/A',
      packagingDescription: this.formatPackaging(item),
      unitPrice: parseFloat(item.unitPrice) || 0
    }));
  }

  /**
   * Formats packaging information for display
   * @param item - The supplier item
   * @returns Formatted packaging string
   */
  private formatPackaging(item: ResponseSupplierItemsBySupplierIdDTO): string {
    if (!item.packaging) return 'N/A';

    const units = item.packaging.unitsPerPackage || 1;
    const uomName = item.unitOfMeasure?.name || '';

    if (uomName) {
      return `${uomName}${units !== 1 ? 's' : ''} X ${units}`;
    }
    return `${units === 1 ? 'unidad' : 'unidades'} X ${units}`;
  }

  /**
   * Component cleanup
   * Unsubscribes from tutorial service
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Loads suppliers with current filters
   * Enriches each supplier with first active contact information
   */
  loadSuppliers(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const searchFilters: SupplierFiltersDTO = {
      page: this.supplierFilters.page,
      size: 100,
      sort: this.supplierFilters.sort
    };

    if (this.supplierFilters.isActive !== undefined) {
      searchFilters.isActive = this.supplierFilters.isActive;
    }

    this.suppliersService.searchSuppliers(searchFilters).subscribe({
      next: (response) => {
        const enriched = (response.content || []).map((s: ResponseSupplierDTO) => {
          const firstActiveContact = (s.contacts || []).find(c => c.isActive);
          const firstContact = firstActiveContact ?? (s.contacts?.length > 0 ? s.contacts[0] : null);

          let contactLabel = firstContact?.label || '';
          if (!contactLabel && firstContact?.contactType) {
            if (firstContact.contactType === 'EMAIL') {
              contactLabel = 'Email';
            } else if (firstContact.contactType === 'PHONE') {
              contactLabel = 'Teléfono';
            } else if (firstContact.contactType === 'ADDRESS') {
              contactLabel = 'Dirección';
            }
          }

          return {
            ...s,
            contact: contactLabel,
            emailOrPhone: firstContact?.description ?? ''
          } as ResponseSupplierDTO & { contact: string; emailOrPhone: string };
        });

        this.allSuppliers = enriched;
        this.suppliers.set(enriched);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = this.extractErrorMessage(error, 'al cargar los proveedores');
        this.showError(errorMessage);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handles filter changes from GenericTableComponent
   * Updates filter state and reloads suppliers
   *
   * @param event - Filter change event with active filters
   */
  onFilterChange(event: FilterChangeEvent): void {
    if (event.filters.length === 0) {
      this.supplierFilters.isActive = undefined;
    } else {
      event.filters.forEach(f => {
        switch (f.id) {
        case 'is_active':
          this.supplierFilters.isActive =
              f.value === null || f.value === ''
                ? undefined
                : (f.value as boolean);
          break;
        }
      });
    }

    this.loadSuppliers();
  }

  /**
   * Global search filter
   * Filters suppliers locally by CUIT, company name, or contact information
   *
   * @param event - Input event from search field
   */
  onGlobalFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    const searchTerm = input.value.toLowerCase().trim();

    if (!searchTerm) {
      this.loadSuppliers();
      return;
    }

    const allSuppliers = this.suppliers();
    const filtered = allSuppliers.filter(supplier =>
      supplier.cuit.toLowerCase().includes(searchTerm) ||
      supplier.companyName.toLowerCase().includes(searchTerm) ||
      (supplier.contacts && supplier.contacts.some(c =>
        c.description?.toLowerCase().includes(searchTerm) ||
        c.label?.toLowerCase().includes(searchTerm)
      ))
    );

    this.suppliers.set(filtered);
  }

  /**
   * Navigates to supplier edit page
   *
   * @param supplier - Supplier to edit
   */
  editSupplier(supplier: ResponseSupplierDTO): void {
    this.router.navigate([
      '/procurement-inventory/suppliers',
      supplier.id,
      'edit'
    ]);
  }

  /**
   * Opens deactivation modal for supplier
   * Resets reason and error state
   *
   * @param supplier - Supplier to deactivate
   */
  deactivateSupplier(supplier: ResponseSupplierDTO): void {
    this.supplierToDeactivate = supplier;
    this.deactivationReason = '';
    this.deactivationReasonError = '';
    this.showDeactivationModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirms supplier deactivation
   */
  confirmDeactivation(): void {
    if (!this.supplierToDeactivate) {
      this.closeDeactivationModal();
      return;
    }

    this.deactivationReasonError = '';
    const reason = this.deactivationReason?.trim() || '';

    this.suppliersService
      .deactivateSupplier(this.supplierToDeactivate.id, reason)
      .subscribe({
        next: (response: any) => {
          const successMessage = response?.message || 'Proveedor desactivado correctamente';
          this.showSuccess(successMessage);
          this.closeDeactivationModal();
          this.loadSuppliers();
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error, 'al desactivar el proveedor');
          this.showError(errorMessage);
          this.closeDeactivationModal();
        }
      });
  }

  /**
   * Closes deactivation modal
   * Resets all modal state
   */
  closeDeactivationModal(): void {
    this.showDeactivationModal = false;
    this.deactivationReason = '';
    this.deactivationReasonError = '';
    this.supplierToDeactivate = null;
    this.cdr.markForCheck();
  }

  /**
   * Opens reactivation modal for supplier
   *
   * @param supplier - Supplier to reactivate
   */
  reactivateSupplier(supplier: ResponseSupplierDTO): void {
    this.supplierToReactivate = supplier;
    this.showReactivationModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirms supplier reactivation
   */
  confirmReactivation(): void {
    if (!this.supplierToReactivate) {
      this.closeReactivationModal();
      return;
    }

    this.suppliersService.reactivateSupplier(this.supplierToReactivate.id).subscribe({
      next: (response: any) => {
        const successMessage = response?.message || 'Proveedor reactivado correctamente';
        this.showSuccess(successMessage);
        this.closeReactivationModal();
        this.loadSuppliers();
      },
      error: (error) => {
        const errorMessage = this.extractErrorMessage(error, 'al reactivar el proveedor');
        this.showError(errorMessage);
        this.closeReactivationModal();
      }
    });
  }

  /**
   * Closes reactivation modal
   * Resets all modal state
   */
  closeReactivationModal(): void {
    this.showReactivationModal = false;
    this.supplierToReactivate = null;
    this.cdr.markForCheck();
  }

  /**
   * Gets deactivation modal confirmation message
   *
   * @returns Formatted confirmation message with supplier name
   */
  get deactivationModalMessage(): string {
    const companyName = this.supplierToDeactivate?.companyName || '';
    return `¿Está seguro que desea desactivar el proveedor "${companyName}"?`;
  }

  /**
   * Gets reactivation modal confirmation message
   *
   * @returns Formatted confirmation message with supplier name
   */
  get reactivationModalMessage(): string {
    const companyName = this.supplierToReactivate?.companyName || '';
    return `¿Está seguro que desea reactivar el proveedor "${companyName}"?`;
  }

  /**
   * Navigates to supplier creation page
   */
  createSupplier(): void {
    this.router.navigate(['/procurement-inventory/suppliers/create']);
  }

  /**
   * Get filtered data for export (from GenericTable's internal filtered data)
   */
  private getFilteredDataForExport(): SupplierDisplayRow[] {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as SupplierDisplayRow[];
    }
    // Fallback to all suppliers if table not available
    return this.suppliers() as SupplierDisplayRow[];
  }

  /**
   * Export suppliers to Excel
   */
  async onExportExcel(): Promise<void> {
    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showError('No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: SUPPLIER_EXPORT_COLUMNS,
        fileName: 'proveedores',
        sheetName: 'Proveedores',
        includeTimestamp: true
      });

      if (result.success) {
        this.showSuccess('Proveedores exportados correctamente.');
      } else {
        this.showError(result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showError('No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Export suppliers to PDF
   */
  async onExportPdf(): Promise<void> {
    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showError('No hay datos para exportar con los filtros aplicados.');
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: SUPPLIER_PDF_COLUMNS,
        fileName: 'proveedores',
        title: 'Listado de Proveedores',
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
        this.showSuccess('Proveedores exportados correctamente.');
      } else {
        this.showError(result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showError('No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Extracts error message from backend response
   * Handles field validation errors and generic messages
   *
   * @param error - Error object from HTTP response
   * @param context - Optional context string for error message
   * @returns Formatted error message
   */
  private extractErrorMessage(error: any, context?: string): string {
    let errorMessage = context
      ? `Ocurrió un error inesperado ${context}.`
      : 'Ocurrió un error inesperado. Intente nuevamente o contacte al administrador.';

    if (error?.status) {
      switch (error.status) {
      case 0:
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet o contacte al administrador.';
        return errorMessage;
      case 500:
        errorMessage = context
          ? `Error en el servidor ${context}. Por favor, intente nuevamente más tarde o contacte al administrador.`
          : 'Error interno del servidor. Por favor, intente nuevamente más tarde o contacte al administrador.';
        return errorMessage;
      case 503:
        errorMessage = 'El servicio no está disponible temporalmente. Por favor, intente nuevamente más tarde.';
        return errorMessage;
      case 404:
        errorMessage = context
          ? `No se encontró el recurso solicitado ${context}.`
          : 'No se encontró el recurso solicitado.';
        return errorMessage;
      case 403:
        errorMessage = 'No tiene permisos para realizar esta acción.';
        return errorMessage;
      case 401:
        errorMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        return errorMessage;
      }
    }

    if (error?.error?.validationErrors && typeof error.error.validationErrors === 'object') {
      const validationErrors = error.error.validationErrors;
      const fieldErrors = Object.values(validationErrors).join(', ');
      const mainMessage = error.error.message || 'Error de validación en los campos';
      errorMessage = `${mainMessage}: ${fieldErrors}`;
    }
    else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    else if (error?.error?.detail) {
      errorMessage = error.error.detail;
    }
    else if (error?.message && !error.message.includes('Http failure response')) {
      errorMessage = error.message;
    }

    return errorMessage;
  }

  /**
   * Displays success alert message
   * Auto-hides after 5 seconds
   *
   * @param message - Success message to display
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
   * Displays error alert message
   * Auto-hides after 5 seconds
   *
   * @param message - Error message to display
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
   * Gets PrimeIcons icon class for contact type
   *
   * @param contactType - Contact type (EMAIL, PHONE, ADDRESS)
   * @returns PrimeIcons CSS class string
   */
  getContactIcon(contactType: string): string {
    const iconMap: Record<string, string> = {
      'EMAIL': 'pi pi-envelope text-brand-primary',
      'PHONE': 'pi pi-phone text-brand-primary',
      'ADDRESS': 'pi pi-map-marker text-brand-primary'
    };
    return iconMap[contactType] || 'pi pi-info-circle text-brand-primary';
  }

  /**
   * Gets default label for contact type when no custom label exists
   *
   * @param contactType - Contact type (EMAIL, PHONE, ADDRESS)
   * @returns Localized contact type label
   */
  getContactLabel(contactType: string): string {
    const labelMap: Record<string, string> = {
      'EMAIL': 'Email',
      'PHONE': 'Teléfono',
      'ADDRESS': 'Dirección'
    };
    return labelMap[contactType] || 'Contacto';
  }
}
