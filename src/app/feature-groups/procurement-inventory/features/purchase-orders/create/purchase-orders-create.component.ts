/* eslint-disable import/order */
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// PrimeNG modules (grouped)
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// App modules
import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { GenericProcurementFormComponent } from '../../../shared/components/generic-form/generic-procurement-form.component';

import { GenericFormConfig } from '../../../models/form-config.model';
import { CREATE_PURCHASE_ORDER_FORM_CONFIG } from '../../../models/purchase-orders/purchase-order-form.config';
import { RequestPurchaseOrderDTO } from '../../../models/purchase-orders/purchase-orders.models';
import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';
import { CreatePurchaseOrderDetailDTO } from '../../../models/purchase-order-details/purchase-order-details.models';
import { PurchaseOrderDetailsService } from '../../../services/purchase-order-details/purchase-order-details.service';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';
import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { SuppliersService } from '../../../services/suppliers.service';
import { LocationsService } from '../../../services/locations.service';
import { Subscription } from 'rxjs';
import { ProcurementValidationConstants } from '../../../models/form-config.model';


/**
 * Component that handles purchase order creation.
 * Relies on the shared procurement-inventory generic form.
 */
@Component({
  selector: 'app-purchase-orders-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericProcurementFormComponent,
    ButtonModule,
    DropdownModule,
    PanelModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './purchase-orders-create.component.html',
  styleUrls: ['./purchase-orders-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersCreateComponent implements OnInit, OnDestroy {

  formFields: GenericFormField[] = [];
  initialFormValue: Record<string, any> = {};
  formConfig: GenericFormConfig = CREATE_PURCHASE_ORDER_FORM_CONFIG;

  // User roles detected (useful for permission debugging)
  userRoles: string[] = [];
  userCanCreate = true;

  // Component state
  saving = false;
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;
  suppliers: ResponseSupplierDTO[] = [];

  // Detalles editables (grilla)
  editableItems: PurchaseOrderDetailItem[] = [];
  editingIndex = -1;

  // Available supplier items
  filteredSupplierItems: any[] = [];

  selectedSupplierId?: number | null = null;

  // Available locations
  locations: any[] = [];

  // Persist the current form snapshot when it changes
  private currentFormData: any = {};
  private formValueSubscription?: Subscription;

  private purchaseOrderDetailsService = inject(PurchaseOrderDetailsService);
  private purchaseOrdersService = inject(PurchaseOrdersService);
  private suppliersService = inject(SuppliersService);
  private supplierItemsService = inject(SupplierItemsService);
  private locationsService = inject(LocationsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private document = inject(DOCUMENT);
  /**
   * OnInit
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Órdenes de compra > Crear',
      '/procurement-inventory/purchase-orders'
    );

    this.initializeFormFields();


    // Verificar permisos locales: solo OPERADOR_COMPRAS y ADMINISTRADOR pueden crear
    const roles = this.authService.getUserRoles();
    // Keep roles for debugging purposes in the UI
    this.userRoles = Array.isArray(roles) ? roles : (roles ? [String(roles)] : []);
    this.userCanCreate = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');
    if (!this.userCanCreate) {
      // Hide submit button to block attempts and show a clear alert
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra. Contacte a un administrador.');
      // Do not redirect; the user can view the form but not create
    }

    this.loadSuppliers();
    this.loadLocations();
  }


  /**
   * Cleans up active subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.formValueSubscription?.unsubscribe();
  }

  /**
   * Initializes the shared form field definition.
   */
  private initializeFormFields(): void {
    const today = new Date();

    this.formFields = [
      {
        name: 'order_date',
        label: 'Fecha de orden',
        type: 'date',
        required: true,
        placeholder: 'Seleccione la fecha',
        colSpan: 2
      },
      {
        name: 'supplier_id',
        label: 'Proveedor',
        type: 'select',
        required: true,
        placeholder: 'Seleccione el proveedor',
        options: [],
        filter: true,
        filterBy: 'label',
        filterPlaceholder: 'Buscar proveedor...',
        colSpan: 2,
        messages: { required: 'Debe seleccionar un proveedor' }
      },
      {
        name: 'destination_location_id',
        label: 'Ubicación destino',
        type: 'select',
        placeholder: 'Seleccione la ubicación destino',
        options: [],
        filter: true,
        filterBy: 'label',
        filterPlaceholder: 'Buscar ubicación...',
        colSpan: 2
      },
      {
        name: 'notes',
        label: 'Notas',
        type: 'textarea',
        placeholder: 'Notas adicionales',
        maxLength: ProcurementValidationConstants.MAX_OBSERVATIONS_LENGTH,
        rows: 3,
        colSpan: 4,
        hint: 'Notas o comentarios sobre la orden'
      }
    ];

    this.initialFormValue = { order_date: today };
    this.currentFormData = { order_date: today };
  }


  /**
   * Reacts to form changes to keep local state and dependencies in sync.
   */
  onFormChange(value: any): void {
    this.handleFormValueChange(value);
  }

  /**
   * Reacts to form changes to keep local state and dependencies in sync.
   */
  private handleFormValueChange(value: any): void {
    this.currentFormData = value || {};
    const newSupplierId = value?.supplier_id !== undefined && value?.supplier_id !== null
      ? Number(value.supplier_id)
      : null;

    if (newSupplierId && newSupplierId !== this.selectedSupplierId) {
      this.selectedSupplierId = newSupplierId;
      this.loadSupplierItems();
      this.editableItems = [];
      this.cdr.markForCheck();
    } else if (!newSupplierId && this.selectedSupplierId) {
      this.selectedSupplierId = null;
      this.filteredSupplierItems = [];
      this.editableItems = [];
      this.cdr.markForCheck();
    }
  }


  /**
   * Load active suppliers from the backend
   */
  private loadSuppliers(): void {
    this.suppliersService.getActiveSuppliers().subscribe({
      next: (list) => {
        if (Array.isArray(list) && list.length > 0) {
          this.suppliers = list.sort((a, b) => a.companyName.localeCompare(b.companyName));
          this.updateSupplierOptions();
          this.cdr.markForCheck();
        } else {
          this.showError('No hay proveedores activos disponibles');
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        if (err?.status === 403) {
          this.userCanCreate = false;
          this.showError('Acceso denegado al listar proveedores. Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra.');
        } else {
          this.showError('Error al cargar los proveedores. Intente nuevamente.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load active locations from the backend
   */
  private loadLocations(): void {
    this.locationsService.getActiveLocations().subscribe({
      next: (list) => {
        if (Array.isArray(list) && list.length > 0) {
          this.locations = list.sort((a, b) => a.name.localeCompare(b.name));
          this.updateLocationOptions();
          this.cdr.markForCheck();
        } else {
          this.cdr.markForCheck();
        }
      },
      error: (_err) => {
        this.showError('Error al cargar las ubicaciones. Intente nuevamente.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Update the location field options
   */
  private updateLocationOptions(): void {
    const locationField = this.formConfig.sections?.[0]?.fields?.find(
      (field: any) => field.name === 'destination_location_id'
    );

    if (locationField) {
      locationField.options = this.locations.map(location => ({
        label: `${location.name}`,
        value: location.id
      }));
    }
  }

  /**
   * Update the supplier field options
   */
  private updateSupplierOptions(): void {
    const supplierField = this.formConfig.sections?.[0]?.fields?.find(
      (field: any) => field.name === 'supplier_id'
    );

    if (supplierField) {
      supplierField.options = this.suppliers.map(supplier => ({
        label: `${supplier.companyName} (CUIT: ${supplier.cuit})`,
        value: supplier.id
      }));
    }
  }

  /**
   * Handle form submission
   * Convert form data to the expected backend format
   */
  onFormSubmit(formData: any): void {
    this.currentFormData = formData ? { ...formData } : {};

    if (!this.userCanCreate) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra');
      return;
    }

    // Client-side permission check before submitting - OPERADOR_COMPRAS o ADMINISTRADOR
    const rolesSubmit = this.authService.getUserRoles();
    const canCreateSubmit = rolesSubmit.includes('OPERADOR_COMPRAS') || rolesSubmit.includes('ADMINISTRADOR');
    if (!canCreateSubmit) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra');
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Map form data to the backend DTO
    const createDTO: RequestPurchaseOrderDTO = this.mapFormDataToDTO(formData);

    // Debugging: token/roles logging removed (no-console lint). If needed, use a logger service.

    this.purchaseOrdersService.create(createDTO).subscribe({
      next: (response) => {
        this.saving = false;
        this.showSuccess(response.message || 'Orden de compra creada exitosamente');

        const createdId = response?.purchaseOrder?.id;
        if (createdId && this.editableItems.length) {
          // Create each detail item associated to the new purchase order
          // Send only required fields: purchase_order_id, supplier_item_id, quantity, unit_price
          const creates: CreatePurchaseOrderDetailDTO[] = this.editableItems.map(d => ({
            purchase_order_id: createdId,
            supplier_item_id: d.supplier_item_id!,
            quantity: d.quantity,
            unit_price: d.unit_price
          }));

          // Send sequentially for simplicity and clearer error handling
          (async () => {
            for (const dto of creates) {
              try {
                // Await toPromise pattern not ideal but keeps compatibility with subscribe-based services
                await this.purchaseOrderDetailsService.create(dto).toPromise();
              } catch (err) {
                const error = err as { error?: { message?: string }; message?: string };
                const emsg = error?.error?.message || error?.message || String(err);
                this.showError(`No se pudo crear detalle: ${emsg}`);
              }
            }
          })();
        }

        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/purchase-orders']);
        }, 1500);

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        // Specific HTTP error handling
        let errorMessage = 'Error al crear la orden de compra';
        if (error.status === 400) {
          errorMessage = error.error?.message || 'La fecha de creación no puede ser anterior a la fecha actual.';
        } else if (error.status === 403) {
          // Backend denied permission. Show explicit message and disable submit
          const rolesErr = this.authService.getUserRoles();
          errorMessage = 'Acceso denegado: Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra. Roles actuales: ' + (rolesErr && rolesErr.length ? rolesErr.join(', ') : 'Sin roles detectados') + '.';
          // Prevent new attempts
          this.userCanCreate = false;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.showError(errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map form data to the expected backend DTO
   * Backend espera: supplier_id, destination_location_id, notes (snake_case)
   * NO enviar order_date - el backend lo asigna automáticamente con la fecha actual
   * NO enviar status - el backend siempre asigna PENDING automáticamente
   */
  private mapFormDataToDTO(formData: any): RequestPurchaseOrderDTO {
    // Backend espera los campos en snake_case
    // NO incluir order_date - el backend lo asigna automáticamente
    // NO incluir status - el backend lo ignora y siempre asigna PENDING
    const dto: RequestPurchaseOrderDTO = {
      supplier_id: formData.supplier_id,
      notes: formData.notes || undefined
    };

    // Add destination_location_id only when selected
    if (formData.destination_location_id) {
      dto.destination_location_id = Number(formData.destination_location_id);
    }

    return dto;
  }


  /**
   * Handle form cancellation
   */
  onFormCancel(): void {
    this.router.navigate(['/procurement-inventory/purchase-orders']);
  }

  /**
   * Navigate back to purchase orders list
   */
  onBack(): void {
    this.router.navigate(['/procurement-inventory/purchase-orders']);
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

  /** Calculates the total by summing quantity * unit_price */
  get totalAmount(): number {
    return this.editableItems.reduce((sum, d) => sum + (Number(d.quantity || 0) * Number(d.unit_price || 0)), 0);
  }

  /** Triggers form submission from external buttons */
  public triggerFormSubmit(): void {
    if (!this.userCanCreate) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra');
      return;
    }

    // Ensure there is at least one detail row
    if (this.editableItems.length === 0) {
      this.showError('Debe agregar al menos un detalle a la orden de compra');
      return;
    }

    // Ensure every detail row has the required fields
    const invalidItems = this.editableItems.filter(item =>
      !item.supplier_item_id ||
      !item.quantity || item.quantity <= 0 ||
      item.unit_price === undefined || item.unit_price === null || item.unit_price < 0
    );

    if (invalidItems.length > 0) {
      this.showError('Hay detalles incompletos. Por favor complete todos los campos obligatorios (Item, Cantidad, Precio).');
      return;
    }

    this.onFormSubmit(this.currentFormData);
  }

  // ========== EDITABLE GRID HELPERS ==========

  /**
   * Adds a new empty row to the grid
   */
  addNewItem(): void {
    if (!this.userCanCreate) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden crear órdenes de compra');
      return;
    }


    const newItem: PurchaseOrderDetailItem = {
      supplier_item_id: null,
      supply_id: null,
      unit_of_measure_id: null,
      packaging_id: null,
      quantity: null as any,
      unit_price: 0
    };

    this.editableItems.push(newItem);
    this.editingIndex = this.editableItems.length - 1;
    this.cdr.markForCheck();

    // Focus the first cell of the new row
    setTimeout(() => {
      const lastRow = this.editableItems.length - 1;
      const selector = `select[data-row="${lastRow}"][data-col="supplier_item_id"]`;
      const el = this.document.querySelector<any>(selector);
      if (el) el.focus();
    }, 100);
  }

  /**
   * Deletes an item from the grid
   */
  deleteItem(index: number): void {
    this.editableItems.splice(index, 1);
    if (this.editingIndex === index) {
      this.editingIndex = -1;
    } else if (this.editingIndex > index) {
      this.editingIndex--;
    }
    this.cdr.markForCheck();
  }

  /**
   * Handles cell focus
   */
  onCellFocus(rowIndex: number, _colName: string): void {
    this.editingIndex = rowIndex;
  }

  /**
   * Handles keyboard navigation in the grid
   */
  onKeyDown(event: any, rowIndex: number, colName: string): void {
    const cols = ['supplier_item_id', 'quantity', 'unit_price'];
    const currentColIndex = cols.indexOf(colName);

    if (event.key === 'Enter') {
      event.preventDefault();

      // If it is the last editable column, append a new row
      if (currentColIndex === cols.length - 1) {
        this.addNewItem();
      } else {
        // Move focus to the next field in the row
        const nextCol = cols[currentColIndex + 1];
        const selector = `[data-row="${rowIndex}"][data-col="${nextCol}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < this.editableItems.length) {
        const selector = `[data-row="${nextRow}"][data-col="${colName}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevRow = rowIndex - 1;
      if (prevRow >= 0) {
        const selector = `[data-row="${prevRow}"][data-col="${colName}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    }
  }

  /**
   * Maneja la selección de un supplier item
   * Autocompleta el precio unitario y la información de UOM/packaging
   * Soporta la estructura que devuelve el backend en el GET de details
   */
  onSupplierItemSelected(rowIndex: number, supplierItemId: any): void {
    if (!supplierItemId) return;

    const selectedItemId = Number(supplierItemId);

    const item = this.filteredSupplierItems.find(si => si.id === selectedItemId);
    if (!item) {
      return;
    }

    const editItem = this.editableItems[rowIndex];

    // Obtener el objeto raw que contiene todos los datos del backend
    const rawItem = item.raw || item;

    // 1. PRECIO UNITARIO (obligatorio)
    // El precio siempre es por packaging, no por unidad base
    editItem.unit_price = Number(rawItem.unitPrice || item.unit_price || 0);

    // 2. NOMBRE DEL ITEM DEL PROVEEDOR (supplier_item_description)
    // Este es el nombre descriptivo que pone el proveedor
    const supplierItemDescription = rawItem.description || item.description || '';
    editItem.supplier_item_description = supplierItemDescription;

    // 3. NOMBRE DEL SUPPLY (insumo limpio, sin packaging)
    const supplyName = this.cleanSupplyName(rawItem.supply?.name || '');
    editItem.supply_name = supplyName || supplierItemDescription;

    // 4. PACKAGING (empaque)
    // El backend devuelve: packaging.unitsPerPackage y packaging.uomName
    const packaging = rawItem.packaging || rawItem.Packaging || {};
    const unitsPerPackage = packaging.unitsPerPackage || packaging.units_per_package || 1;

    editItem.units_per_package = unitsPerPackage;

    // 5. UOM (unidad de medida)
    // Puede venir en múltiples ubicaciones:
    // - rawItem.unitOfMeasure.name (estructura del backend)
    // - packaging.uomName (dentro del packaging)
    // - packaging.uom.name (objeto UOM anidado en packaging)
    const uomName = rawItem.unitOfMeasure?.name ||
                    packaging.uomName ||
                    packaging.uom?.name ||
                    '';

    editItem.uom_name = uomName;

    // Construir packaging_description en formato "Unidad X cantidad"
    // Ej: "Litro X 1", "Unidad X 100", "Caja X 50"
    if (uomName) {
      editItem.packaging_description = `${uomName} X ${unitsPerPackage}`;
    } else {
      editItem.packaging_description = `Unidad X ${unitsPerPackage}`;
    }

    // 6. Calcular valores derivados (total_units, price_per_base_unit)
    this.calculateDerivedValues(editItem);

    this.cdr.markForCheck();
  }

  /**
   * Calcula valores derivados para un item:
   * - total_units: quantity × units_per_package
   * - price_per_base_unit: unit_price ÷ units_per_package
   */
  private calculateDerivedValues(item: PurchaseOrderDetailItem): void {
    const unitsPerPackage = item.units_per_package || 1;
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;

    item.total_units = quantity * unitsPerPackage;
    item.price_per_base_unit = unitsPerPackage > 0 ? unitPrice / unitsPerPackage : 0;
  }

  /**
   * Limpia el nombre del supply eliminando información de packaging duplicada
   * Patrones comunes: (CAJA X 100), (PACK X 50), (BOX X 10), (BD X 10), etc.
   */
  private cleanSupplyName(supplyName: string): string {
    if (!supplyName) return '';

    return supplyName
      .replace(/\s*\(CAJA\s+X\s+\d+\)\s*$/i, '')
      .replace(/\s*\(PACK\s+X\s+\d+\)\s*$/i, '')
      .replace(/\s*\(BOX\s+X\s+\d+\)\s*$/i, '')
      .replace(/\s*\(BD\s+X\s+\d+\)\s*$/i, '')
      .replace(/\s*\(UNIDAD\s+X\s+\d+\)\s*$/i, '')
      .replace(/\s*\(x\s*\d+\s*unidades?\)\s*$/i, '')
      .trim();
  }

  /**
   * Determina si un UOM permite cantidades decimales
   * UOMs de peso, volumen y longitud permiten decimales
   * UOMs de conteo (Unidad, Caja, Pack) solo permiten enteros
   */
  isDecimalQuantityAllowed(uomName: string): boolean {
    if (!uomName) return false;

    const uomLower = uomName.toLowerCase();

    // UOMs que permiten decimales
    const decimalUoms = [
      'litro', 'liter', 'l',
      'mililitro', 'milliliter', 'ml',
      'kilogramo', 'kilogram', 'kg',
      'gramo', 'gram', 'g',
      'metro', 'meter', 'm',
      'centimetro', 'centimeter', 'cm',
      'milimetro', 'millimeter', 'mm'
    ];

    return decimalUoms.some(uom => uomLower.includes(uom));
  }

  /**
   * Obtiene el step para el input de cantidad según el UOM
   * Retorna '0.01' para UOMs decimales, '1' para UOMs enteros
   */
  getQuantityStep(item: PurchaseOrderDetailItem): string {
    return this.isDecimalQuantityAllowed(item.uom_name || '') ? '0.1' : '1';
  }

  /**
   * Calcula el subtotal de una línea de detalle
   */
  calculateLineTotal(item: PurchaseOrderDetailItem): number {
    return (item.quantity || 0) * (item.unit_price || 0);
  }

  /**
   * Maneja cambios en cantidad para recalcular valores derivados
   */
  onQuantityChange(rowIndex: number): void {
    const item = this.editableItems[rowIndex];
    if (item) {
      this.calculateDerivedValues(item);
    }
    this.cdr.markForCheck();
  }

  /**
   * Obtiene los items disponibles para una fila específica
   * Excluye los items que ya están seleccionados en OTRAS filas
   * Formatea el label para mostrar: "Insumo - UOM xCantidad - Precio"
   */
  getAvailableItemsForRow(rowIndex: number): any[] {
    if (!this.filteredSupplierItems || this.filteredSupplierItems.length === 0) {
      return [];
    }

    // Obtener los IDs de items ya seleccionados en OTRAS filas
    const selectedItemIds = this.editableItems
      .map((item, index) => index !== rowIndex ? item.supplier_item_id : null)
      .filter(id => id !== null && id !== undefined);

    // Filtrar los items: mostrar solo los que NO están en selectedItemIds
    const availableItems = this.filteredSupplierItems.filter(item =>
      !selectedItemIds.includes(Number(item.id))
    );

    // Formatear cada item con información de packaging
    return availableItems.map(item => {
      // Obtener el objeto raw que contiene todos los datos del backend
      const rawItem = item.raw || item;

      // Extraer packaging del objeto raw
      const packaging = rawItem.packaging || rawItem.Packaging || {};

      // Extraer unitsPerPackage (backend lo devuelve como unitsPerPackage)
      const unitsPerPackage = packaging.unitsPerPackage || packaging.units_per_package || 1;

      // Extraer UOM name - puede estar en múltiples ubicaciones
      const uomName = rawItem.unitOfMeasure?.name ||
                      packaging.uomName ||
                      packaging.uom?.name ||
                      '';

      // Extraer precio del raw item
      const price = Number(rawItem.unitPrice || item.unit_price || 0);

      // Extraer y limpiar el nombre del supply
      const supplyName = this.cleanSupplyName(
        rawItem.supply?.name ||
        rawItem.description ||
        item.description ||
        'Sin nombre'
      );

      // Formato: "AGUA HIPODERMICA 25/6 (23G X 1) BD - Litro x1 - $50000.00"
      const formattedLabel = `${supplyName} - ${uomName} x${unitsPerPackage} - $${price.toFixed(2)}`;

      return {
        ...item,
        name: formattedLabel,
        originalName: item.name || item.description
      };
    });
  }


  /**
   * Loads the items of the selected supplier
   */
  private loadSupplierItems(): void {
    if (!this.selectedSupplierId) {
      this.filteredSupplierItems = [];
      return;
    }

    this.supplierItemsService.getBySupplier(this.selectedSupplierId).subscribe({
      next: (items) => {
        this.filteredSupplierItems = items || [];

        // Automatically add an empty detail row if none exists
        if (this.userCanCreate && this.editableItems.length === 0) {
          this.addNewItem();
        }

        this.cdr.markForCheck();
      },
      error: (_err) => {
        this.filteredSupplierItems = [];
        this.showError('Error al cargar los ítems del proveedor. Intente nuevamente.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Builds a human readable packaging label based on supplier item data.
   */
  private formatPackagingDisplay(item: any): string | null {
    if (!item) return null;

    const packaging = item.packaging || item.packaging_info || item.packagingInfo;

    if (!packaging) {
      return item.packaging_info || null;
    }

    if (typeof packaging === 'string') {
      return packaging;
    }

    const units = packaging.units_per_package ?? packaging.unitsPerPackage ?? packaging.units;
    const uom = packaging.uom_name ?? packaging.uomName ?? packaging.unit_of_measure_name ?? packaging.unit ?? null;

    if (units && uom) {
      return `${units} x ${uom}`;
    }
    if (units) {
      return `${units}`;
    }
    if (uom) {
      return uom;
    }

    return null;
  }
}

/**
 * Interfaz para un item editable en la grilla de detalles
 * Campos obligatorios según el backend:
 * - quantity (cantidad en la UOM del packaging)
 * - unit_price (precio por unidad de packaging)
 * - purchase_order_id (se asigna después de crear la orden)
 * - supplier_item_id
 *
 * Campos adicionales para mostrar en UI (vienen del backend en GET /details):
 * - supplier_item_description: Nombre descriptivo del item del proveedor
 * - supply_name: Nombre limpio del insumo (sin packaging)
 * - uom_name: Nombre de la unidad de medida (Unidad, Caja, Pack, Litro, Kilogramo)
 * - units_per_package: Cantidad de unidades base por packaging
 * - packaging_description: Descripción del packaging
 */
interface PurchaseOrderDetailItem {
  supplier_item_id: number | null;
  supply_id: number | null;
  unit_of_measure_id: number | null;
  packaging_id: number | null;
  quantity: number;
  unit_price: number;
  // Información del supplier item
  supplier_item_description?: string; // Descripción del item del proveedor
  // Información del supply
  supply_name?: string; // Nombre limpio del insumo (sin packaging)
  // Información de UOM y packaging para mostrar en UI
  uom_name?: string; // Nombre de la unidad de medida
  units_per_package?: number; // Cantidad de unidades en el packaging
  packaging_description?: string; // Descripción del packaging
  // Propiedades calculadas
  total_units?: number; // quantity × units_per_package
  price_per_base_unit?: number; // unit_price ÷ units_per_package
}
