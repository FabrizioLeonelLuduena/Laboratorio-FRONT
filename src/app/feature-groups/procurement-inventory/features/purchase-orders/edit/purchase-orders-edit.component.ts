/* eslint-disable import/order */
/* eslint-disable jsdoc/require-jsdoc */
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// PrimeNG modules
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';

// App modules
import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';
import { PurchaseOrderDetailsService } from '../../../services/purchase-order-details/purchase-order-details.service';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';
import { SuppliersService } from '../../../services/suppliers.service';
import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { LocationsService } from '../../../services/locations.service';

/**
 * Componente para editar órdenes de compra
 * Todo en un solo componente con campos editables
 */
@Component({
  selector: 'app-purchase-orders-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    GenericButtonComponent,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    InputTextarea,
    PanelModule,
    TableModule
  ],
  providers: [],
  templateUrl: './purchase-orders-edit.component.html',
  styleUrls: ['./purchase-orders-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersEditComponent implements OnInit {
  // Estado
  loading = true;
  saving = false;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  // ID de la orden
  purchaseOrderId!: number;

  // Datos de la orden
  orderDate: Date = new Date();
  supplierId: number | null = null;
  destinationLocationId: number | null = null;
  status: string = 'PENDING';
  previousStatus: string = 'PENDING';
  notes: string = '';
  cancellationReason: string = '';

  // Listas para dropdowns
  suppliers: ResponseSupplierDTO[] = [];
  locations: any[] = [];
  supplierItems: any[] = [];
  statusOptions = [
    { label: 'PENDIENTE', value: 'PENDING' },
    { label: 'ENVIADA', value: 'SENT' },
    { label: 'RECIBIDA', value: 'RECEIVED' },
    { label: 'CANCELADA', value: 'CANCELLED' }
  ];

  // Detalles de la orden
  details: any[] = [];


  private purchaseOrderDetailsService = inject(PurchaseOrderDetailsService);
  private purchaseOrdersService = inject(PurchaseOrdersService);
  private suppliersService = inject(SuppliersService);
  private supplierItemsService = inject(SupplierItemsService);
  private locationsService = inject(LocationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.showError('ID de orden no proporcionado');
      this.router.navigate(['/procurement-inventory/purchase-orders']);
      return;
    }

    this.purchaseOrderId = +id;

    this.breadcrumbService.setFromString(
      'Compras e inventario > Órdenes de compra > Editar',
      '/procurement-inventory/purchase-orders'
    );

    // Verificar permisos
    const roles = this.authService.getUserRoles();
    const canEdit = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');
    if (!canEdit) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden editar órdenes de compra.');
    }

    this.loadSuppliers();
    this.loadLocations();
    this.loadPurchaseOrder();
  }

  /**
   * Cargar proveedores
   */
  private loadSuppliers(): void {
    this.suppliersService.getActiveSuppliers().subscribe({
      next: (list) => {
        this.suppliers = (list || []).sort((a, b) => a.companyName.localeCompare(b.companyName));
        this.cdr.markForCheck();
      },
      error: () => {
        this.suppliersService.searchSuppliers({ isActive: true, page: 0, size: 100 }).subscribe({
          next: (response: any) => {
            this.suppliers = (response.content || []).sort((a: any, b: any) =>
              a.companyName.localeCompare(b.companyName)
            );
            this.cdr.markForCheck();
          },
          error: () => {
            this.showError('Error al cargar proveedores');
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  /**
   * Cargar ubicaciones activas
   */
  private loadLocations(): void {
    this.locationsService.getActiveLocations().subscribe({
      next: (list) => {
        this.locations = (list || []).sort((a, b) => a.name.localeCompare(b.name));
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Error al cargar ubicaciones');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cargar orden de compra y sus detalles
   */
  private loadPurchaseOrder(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.purchaseOrdersService.getById(this.purchaseOrderId).subscribe({
      next: (order: any) => {
        // Cargar datos de la orden
        this.orderDate = order.orderDate ? new Date(order.orderDate) : (order.order_date ? new Date(order.order_date) : new Date());
        this.supplierId = order.supplierId || order.supplier_id || order.supplier?.id;
        this.destinationLocationId = order.destinationLocationId || order.destination_location_id || order.destinationLocation?.id || null;
        this.status = order.status || 'PENDING';
        this.previousStatus = this.status;
        this.notes = order.notes || '';
        // Leer cancellationReason en múltiples formatos por compatibilidad
        this.cancellationReason = order.cancellationReason || order.cancellation_reason || order.CancellationReason || '';



        // Cargar items del proveedor PRIMERO, luego los detalles
        if (this.supplierId) {
          this.loadSupplierItemsThenDetails(this.supplierId);
        } else {
          // Si no hay proveedor, cargar solo detalles
          this.loadDetails();
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.showError('Error al cargar la orden: ' + (error.error?.message || error.message));
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cargar detalles de la orden
   */
  private loadDetails(): void {
    this.purchaseOrderDetailsService.getByPurchaseOrder(this.purchaseOrderId).subscribe({
      next: (response: any) => {
        // Normalizar respuesta: puede ser Array directo o un objeto con content (paginado)
        let detailsArray = Array.isArray(response) ? response : (response?.content || []);

        // FILTRAR SOLO DETALLES ACTIVOS - Los desactivados no deben mostrarse
        detailsArray = detailsArray.filter((detail: any) => {
          const isActive = detail.is_active ?? detail.isActive ?? detail.active ?? true;
          return isActive === true;
        });

        // Normalizar cada detalle
        this.details = detailsArray.map((detail: any) => {
          // Determinar supplier_item_id correcto - CONVERTIR A NUMBER
          // IMPORTANTE: El backend devuelve el supplierItemId dentro de detail.supplierItem.id
          const supplierItemId = Number(
            detail.supplierItem?.id ||      // ← El backend lo devuelve aquí
            detail.supplier_item?.id ||
            detail.supplierItemId ||
            detail.supplier_item_id
          ) || null;

          // Extraer nombre limpio del supply
          // IMPORTANTE: El backend puede NO devolver supply, usar supplierItem.description como fallback
          const supplyName = this.cleanSupplyName(
            detail.supply?.name ||
            detail.supplierItem?.description ||
            detail.supplier_item?.supply?.name ||
            detail.supplier_item?.description ||
            'Sin nombre'
          );


          // Extraer información de packaging y UOM
          const packaging = detail.packaging || detail.Packaging || {};
          const unitsPerPackage = packaging.units_per_package || packaging.unitsPerPackage || 1;

          // Extraer UOM - puede venir en múltiples ubicaciones
          // IMPORTANTE: El backend devuelve el UOM en detail.unitOfMeasure, NO en packaging.uom
          const uomName = detail.unitOfMeasure?.name ||
                          detail.unit_of_measure?.name ||
                          packaging.uomName ||
                          packaging.uom?.name ||
                          '';

          // Construir packaging_description usando la UOM correcta
          // Ej: "1 Litro", "100 Unidades", "50 Cajas"
          let packagingDescription;
          if (uomName) {
            packagingDescription = `${uomName} X ${unitsPerPackage}`;
          } else {
            packagingDescription = packaging.description || `Unidad X ${unitsPerPackage}`;
          }

          return {
            ...detail,
            supplier_item_id: supplierItemId,
            quantity: detail.quantity || 0,
            unit_price: detail.unit_price || detail.unitPrice || 0,
            supply_name: supplyName,
            supply: detail.supply || { id: detail.supply_id || detail.supplyId, name: detail.supply?.name || 'N/D' },
            unit_of_measure: detail.unit_of_measure || detail.unitOfMeasure || {
              id: detail.unit_of_measure_id || detail.unitOfMeasureId,
              name: detail.unit_of_measure?.name || detail.unitOfMeasure?.name || 'N/D'
            },
            packaging: packaging ? {
              ...packaging,
              units_per_package: unitsPerPackage,
              description: packagingDescription
            } : {
              id: detail.packaging_id || detail.packagingId,
              units_per_package: 1,
              description: '1 unidad',
              uom_name: 'UNIT'
            },
            packaging_description: packagingDescription,
            uom_name: uomName,
            supplier_item: detail.supplier_item || detail.supplierItem || {
              id: supplierItemId,
              description: detail.supplier_item?.description || detail.supplierItem?.description || 'N/D'
            }
          };
        });

        this.cdr.markForCheck();
      },
      error: () => {
        this.details = [];
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cargar items del proveedor seleccionado
   */
  public onSupplierChange(): void {
    if (this.supplierId) {
      this.loadSupplierItems(this.supplierId);
    } else {
      this.supplierItems = [];
    }
    this.cdr.markForCheck();
  }

  /**
   * Cargar supplier items y luego los detalles (para evitar problemas de sincronización)
   */
  private loadSupplierItemsThenDetails(supplierId: number): void {
    this.supplierItems = [];
    this.cdr.markForCheck();

    this.supplierItemsService.getBySupplier(supplierId).subscribe({
      next: (items: any[]) => {
        // Normalizar IDs a números para asegurar coincidencia en el select
        this.supplierItems = items.map(item => ({
          ...item,
          id: Number(item.id)
        }));

        // Cargar los detalles DESPUÉS de que los supplier items estén listos
        this.loadDetails();

        this.cdr.markForCheck();
      },
      error: () => {
        this.supplierItems = [];
        // Cargar detalles de todas formas
        this.loadDetails();
        this.cdr.markForCheck();
      }
    });
  }

  private loadSupplierItems(supplierId: number): void {
    this.supplierItems = [];
    this.cdr.markForCheck();

    this.supplierItemsService.getBySupplier(supplierId).subscribe({
      next: (items: any[]) => {
        this.supplierItems = items;
        this.cdr.markForCheck();
      },
      error: () => {
        this.supplierItems = [];
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Detectar cambio de estado para manejar motivo de cancelación
   */
  public onStatusChange(): void {
    // Si el estado cambió a CANCELLED, limpiar el campo para que el usuario lo complete
    if (this.status === 'CANCELLED' && this.previousStatus !== 'CANCELLED') {
      this.cancellationReason = '';
    }

    // Si se cambió de CANCELLED a otro estado, limpiar el motivo
    if (this.status !== 'CANCELLED' && this.previousStatus === 'CANCELLED') {
      this.cancellationReason = '';
    }

    this.previousStatus = this.status;
    this.cdr.markForCheck();
  }

  /**
   * Al seleccionar un item del proveedor en una fila de detalle, autocompletar precio y datos
   * Soporta la estructura que devuelve el backend en el GET de details
   * @param index Índice de la fila en el array de detalles
   */
  public onDetailSupplierItemChange(index: number): void {
    const detail = this.details[index];
    if (!detail || !detail.supplier_item_id) {
      return;
    }

    // Asegurar que supplier_item_id sea un número
    const supplierItemId = Number(detail.supplier_item_id);

    const selectedItem = this.supplierItems.find(item => Number(item.id) === supplierItemId);

    if (selectedItem) {
      const rawData = selectedItem.raw || selectedItem;

      // 1. PRECIO UNITARIO (obligatorio)
      // El precio siempre es por packaging, no por unidad base
      let unitPrice = 0;

      // Intentar obtener precio de múltiples fuentes
      if (selectedItem.unit_price !== undefined && selectedItem.unit_price !== null) {
        unitPrice = Number(selectedItem.unit_price);
      } else if (selectedItem.unitPrice !== undefined && selectedItem.unitPrice !== null) {
        unitPrice = Number(selectedItem.unitPrice);
      } else if (rawData.unitPrice !== undefined && rawData.unitPrice !== null) {
        unitPrice = Number(rawData.unitPrice);
      } else if (rawData.unit_price !== undefined && rawData.unit_price !== null) {
        unitPrice = Number(rawData.unit_price);
      } else if (rawData.price !== undefined && rawData.price !== null) {
        unitPrice = Number(rawData.price);
      }

      detail.unit_price = unitPrice || 0;

      // 2. NOMBRE DEL ITEM DEL PROVEEDOR (supplier_item_description)
      const supplierItemDescription = selectedItem.description || selectedItem.itemDescription || '';

      // 3. NOMBRE DEL SUPPLY (insumo limpio, sin packaging)
      const supplyName = this.cleanSupplyName(selectedItem.supply?.name || '');
      detail.supply_name = supplyName || supplierItemDescription;

      // 4. SUPPLIER ITEM INFO
      detail.supplier_item = {
        id: supplierItemId,
        description: supplierItemDescription
      };

      // 5. PACKAGING (empaque)
      // El backend devuelve: packaging.unitsPerPackage
      const packaging = rawData.packaging || rawData.Packaging || {};
      const unitsPerPackage = packaging.unitsPerPackage || packaging.units_per_package || 1;

      // 6. UOM (unidad de medida)
      // IMPORTANTE: El backend devuelve el UOM en rawData.unitOfMeasure, NO en packaging.uom
      const uomName = rawData.unitOfMeasure?.name ||
                      packaging.uomName ||
                      packaging.uom?.name ||
                      '';

      // Construir packaging_description usando la UOM correcta
      // Ej: "Litro X 1", "Unidad X 100", "Caja X 50"
      let packagingDesc;
      if (uomName) {
        packagingDesc = `${uomName} X ${unitsPerPackage}`;
      } else {
        packagingDesc = `Unidad X ${unitsPerPackage}`;
      }

      // Actualizar el detalle con la información extraída
      detail.packaging = {
        ...packaging,
        units_per_package: unitsPerPackage,
        description: packagingDesc
      };
      detail.packaging_description = packagingDesc;
      detail.uom_name = uomName;

      // Asegurar que la cantidad tenga un valor válido
      if (!detail.quantity || detail.quantity <= 0) {
        detail.quantity = 1;
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Maneja cambios en la cantidad de un detalle
   * Dispara la detección de cambios para actualizar unidades totales
   */
  public onDetailQuantityChange(_index: number): void {
    this.cdr.markForCheck();
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
  getQuantityStep(detail: any): string {
    return this.isDecimalQuantityAllowed(detail.uom_name || '') ? '0.1' : '1';
  }

  /**
   * Calcula el subtotal de una línea de detalle
   */
  calculateLineTotal(detail: any): number {
    return (detail.quantity || 0) * (detail.unit_price || 0);
  }

  /**
   * Obtiene los items disponibles para una fila específica
   * Excluye los items que ya están seleccionados en OTRAS filas
   * Formatea el label para mostrar: "Insumo - UOM xCantidad - Precio"
   */
  public getAvailableItemsForRow(rowIndex: number): any[] {
    if (!this.supplierItems || this.supplierItems.length === 0) {
      return [];
    }

    // Obtener los IDs de items ya seleccionados en OTRAS filas
    const selectedItemIds = this.details
      .map((detail, index) => index !== rowIndex ? detail.supplier_item_id : null)
      .filter(id => id !== null && id !== undefined)
      .map(id => Number(id));

    // Filtrar los items: mostrar solo los que NO están en selectedItemIds
    const availableItems = this.supplierItems.filter(item =>
      !selectedItemIds.includes(Number(item.id))
    );


    // Formatear cada item con información de packaging
    return availableItems.map(item => {
      // Obtener el objeto raw que contiene todos los datos del backend
      const rawItem = item.raw || item;

      // Extraer packaging del objeto raw
      const packaging = rawItem.packaging || rawItem.Packaging || {};

      // Extraer unitsPerPackage
      const unitsPerPackage = packaging.unitsPerPackage || packaging.units_per_package || 1;

      // Extraer UOM name - IMPORTANTE: viene en rawItem.unitOfMeasure
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
   * Agregar nuevo detalle vacío a la lista (nueva interfaz de grilla)
   */
  public addDetail(): void {
    if (!this.supplierId) {
      this.showError('Seleccione un proveedor primero');
      return;
    }

    // Agregar fila vacía
    this.details.push({
      id: null, // null indica que es nuevo
      supplier_item_id: null,
      supply_id: null,
      supply: { name: '' },
      packaging_id: null,
      packaging: { units_per_package: 0 },
      quantity: 1,
      unit_price: 0,
      supplier_item: {
        description: ''
      }
    });


    this.cdr.markForCheck();
  }


  /**
   * Eliminar detalle (marcarlo para eliminación al guardar)
   * No se elimina del backend hasta que se haga clic en "Guardar cambios"
   */
  public deleteDetail(index: number): void {
    // Simplemente eliminar del array local
    // El endpoint /sync se encargará de desactivar los detalles que no estén en la lista
    this.details.splice(index, 1);
    this.cdr.markForCheck();
  }

  /**
   * Calcular subtotal de un detalle
   */
  public getSubtotal(detail: any): number {
    return (detail.quantity || 0) * (detail.unit_price || 0);
  }

  /**
   * Calcular total
   */
  get totalAmount(): number {
    return this.details.reduce((sum, d) => sum + this.getSubtotal(d), 0);
  }

  /**
   * Guardar cambios
   */
  public saveChanges(): void {
    const roles = this.authService.getUserRoles();
    const canEdit = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');
    if (!canEdit) {
      this.showError('Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden editar órdenes de compra');
      return;
    }

    // Validaciones antes de guardar
    if (!this.status) {
      this.showError('El estado es obligatorio');
      return;
    }

    // Validar motivo de cancelación si el estado es CANCELLED
    if (this.status === 'CANCELLED') {
      if (!this.cancellationReason || !this.cancellationReason.trim()) {
        this.showError('El motivo de cancelación es obligatorio cuando se cancela una orden');
        return;
      }
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Construir DTO directamente en snake_case (formato que espera el backend)
    // El interceptor case-converter puede estar causando problemas, así que enviamos directo
    const updateDTO: any = {
      status: String(this.status).toUpperCase().trim()
    };

    // Solo incluir notes si tiene valor no vacío
    if (this.notes !== null && this.notes !== undefined && String(this.notes).trim() !== '') {
      updateDTO.notes = String(this.notes).trim();
    }

    // IMPORTANTE: Si status es CANCELLED, el campo cancellationReason es OBLIGATORIO
    // Enviar en camelCase - el interceptor lo convertirá a snake_case automáticamente
    if (this.status === 'CANCELLED') {
      if (this.cancellationReason && String(this.cancellationReason).trim() !== '') {
        updateDTO.cancellationReason = String(this.cancellationReason).trim();
      } else {
        // Esto nunca debería pasar por la validación previa, pero por si acaso
        this.showError('El motivo de cancelación es obligatorio');
        this.saving = false;
        this.cdr.markForCheck();
        return;
      }
    }


    // Incluir destination_location_id si está seleccionado
    if (this.destinationLocationId && !isNaN(Number(this.destinationLocationId))) {
      updateDTO.destinationLocationId = Number(this.destinationLocationId);
    }


    this.purchaseOrdersService.update(this.purchaseOrderId, updateDTO).subscribe({
      next: () => {
        this.processDetailsChanges();
      },
      error: (error) => {
        this.saving = false;

        // Mostrar mensaje más detallado del error
        let errorMsg = 'Error al actualizar la orden';
        if (error.status === 400) {
          errorMsg = 'Error de validación: ' + (error.error?.message || 'Datos inválidos. Verifique el estado seleccionado.');
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }

        this.showError(errorMsg);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Procesar cambios en detalles
   */
  private async processDetailsChanges(): Promise<void> {
    const errorMessages: string[] = [];
    const detailIds: number[] = [];

    // 1. Actualizar o crear detalles
    for (const detail of this.details) {
      if (detail.id) {
        // Actualizar existente - SOLO quantity y unit_price son modificables
        // ⚠️ IMPORTANTE: supplier_item_id NO se puede cambiar en PUT
        try {
          const updateDTO: any = {
            quantity: Number(detail.quantity) || 1
          };

          // unit_price es opcional
          if (detail.unit_price !== undefined && detail.unit_price !== null) {
            updateDTO.unit_price = Number(detail.unit_price);
          }

          // Validación: quantity debe ser > 0
          if (updateDTO.quantity <= 0) {
            errorMessages.push('No se puede actualizar la línea: la cantidad debe ser mayor a 0.');
            continue;
          }

          // Validación: unit_price >= 0
          if (updateDTO.unit_price !== undefined && updateDTO.unit_price < 0) {
            errorMessages.push('No se puede actualizar la línea: el precio no puede ser negativo.');
            continue;
          }

          await this.purchaseOrderDetailsService.update(detail.id, updateDTO).toPromise();
          detailIds.push(detail.id); // Guardar ID del detalle actualizado
        } catch (err) {
          errorMessages.push(`Error al actualizar detalle: ${(err as any)?.error?.message || ''}`);
        }
      } else {
        // Crear nuevo
        try {
          const dto = this.buildDetailDTO(detail);
          // doble-check: si faltan campos obligatorios fallamos aquí
          if (!dto.supplier_item_id || !dto.quantity) {
            errorMessages.push('Línea inválida (faltan datos obligatorios). Revise el ítem seleccionado.');
            continue;
          }
          const createdDetail: any = await this.purchaseOrderDetailsService.create(dto as any).toPromise();
          if (createdDetail?.id) {
            detailIds.push(createdDetail.id); // Guardar ID del detalle creado
          }
        } catch (err) {
          errorMessages.push(`Error al crear detalle: ${(err as any)?.error?.message || ''}`);
        }
      }
    }

    // 2. Sincronizar detalles - desactiva automáticamente los que no están en la lista
    // IMPORTANTE: Siempre llamar a sync, incluso si detailIds está vacío (para desactivar todos los detalles eliminados)
    if (errorMessages.length === 0) {
      try {
        await this.purchaseOrderDetailsService.sync(this.purchaseOrderId, detailIds).toPromise();
      } catch (err: any) {
        // Si el endpoint /sync no existe (404) o tiene error de validación (400),
        // intentar con el método antiguo de desactivación individual
        if (err?.status === 404 || err?.status === 400) {
          // Cargar todos los detalles originales para saber cuáles desactivar
          try {
            const allDetailsResponse: any = await this.purchaseOrderDetailsService
              .getByPurchaseOrder(this.purchaseOrderId)
              .toPromise();

            const allDetails = Array.isArray(allDetailsResponse)
              ? allDetailsResponse
              : (allDetailsResponse?.content || []);

            // Desactivar los que NO están en detailIds
            for (const detail of allDetails) {
              const detailId = detail.id || detail.detail_id;
              const isActive = detail.is_active ?? detail.isActive ?? true;

              if (isActive && !detailIds.includes(detailId)) {
                try {
                  await this.purchaseOrderDetailsService.deactivate(detailId).toPromise();
                } catch (_deactivateErr) {
                  errorMessages.push(`Error al desactivar detalle ${detailId}`);
                }
              }
            }
          } catch (_fallbackErr: any) {
            errorMessages.push('Error al desactivar detalles eliminados');
          }
        } else {
          // Otro tipo de error
          let errorMsg = 'Error al sincronizar detalles';
          if (err?.error?.message) {
            errorMsg += `: ${err.error.message}`;
          } else if (err?.message) {
            errorMsg += `: ${err.message}`;
          } else if (err?.status) {
            errorMsg += ` (HTTP ${err.status})`;
          }
          errorMessages.push(errorMsg);
        }
      }
    }

    this.saving = false;

    // Mostrar resultado final
    if (errorMessages.length === 0) {
      this.showSuccess('Orden de compra actualizada exitosamente');
      setTimeout(() => {
        this.router.navigate(['/procurement-inventory/purchase-orders']);
      }, 1500);
    } else {
      // Mostrar todos los errores acumulados en una sola alerta
      const errorText = errorMessages.join('\n');
      this.showError(errorText);
    }

    this.cdr.markForCheck();
  }

  /**
   * Cancelar
   */
  public cancel(): void {
    this.router.navigate(['/procurement-inventory/purchase-orders']);
  }

  /**
   * Navigate back to purchase orders list
   */
  public onBack(): void {
    this.router.navigate(['/procurement-inventory/purchase-orders']);
  }

  /**
   * Mostrar mensaje de éxito
   */
  private showSuccess(message: string): void {
    this.showAlert('success', 'Operación exitosa', message);
  }

  /**
   * Mostrar mensaje de error
   */
  private showError(message: string): void {
    this.showAlert('error', 'Error en la operación', message);
  }

  /**
   * Muestra una alerta con tipo, título y texto
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
   * Construye y normaliza el DTO que espera el backend para un detalle
   * Campos obligatorios: purchase_order_id, supplier_item_id, quantity
   * Campos opcionales: unit_price
   */
  private buildDetailDTO(detail: any) {
    const supplier_item_id = detail.supplier_item_id || detail.supplierItemId || detail.supplierItem?.id || detail.supplier_item?.id || null;
    const quantity = Number(detail.quantity) || 1;

    // Aceptar varias formas de unit price que puede devolver el BE
    const unit_price = (detail.unit_price !== undefined && detail.unit_price !== null)
      ? Number(detail.unit_price)
      : (detail.unitPrice !== undefined && detail.unitPrice !== null)
        ? Number(detail.unitPrice)
        : (detail.supplierItem?.unitPrice !== undefined && detail.supplierItem?.unitPrice !== null)
          ? Number(detail.supplierItem.unitPrice)
          : undefined;

    const minimalDto: any = {
      purchase_order_id: this.purchaseOrderId,
      supplier_item_id: supplier_item_id,
      quantity: quantity
    };

    if (unit_price !== undefined) {
      minimalDto.unit_price = unit_price;
    }


    return minimalDto;
  }

}
