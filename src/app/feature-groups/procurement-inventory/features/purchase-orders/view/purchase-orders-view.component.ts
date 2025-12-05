/* eslint-disable import/order */
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef, DynamicDialogModule } from 'primeng/dynamicdialog';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

// Models y servicios
import { VIEW_PURCHASE_ORDER_FIELDS, EDIT_PURCHASE_ORDER_FIELDS } from '../../../models/purchase-orders/purchase-order-form.config';
import {
  PurchaseOrderUpdateDTO
} from '../../../models/purchase-orders/purchase-orders.models';
import { PurchaseOrdersService } from '../../../services/purchase-orders/purchase-orders.service';
import { PurchaseOrderDetailsService } from '../../../services/purchase-order-details/purchase-order-details.service';
import { SuppliersService } from '../../../services/suppliers.service';

/**
 * Componente para visualizar y editar detalles de órdenes de compra
 * Utiliza el formulario genérico de procurement-inventory
 */
@Component({
  selector: 'app-purchase-orders-view',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent,
    DynamicDialogModule,
    PanelModule,
    TableModule,
    ButtonModule
  ],
  templateUrl: './purchase-orders-view.component.html',
  styleUrls: ['./purchase-orders-view.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersViewComponent implements OnInit {
  // Configuración del formulario genérico (como suppliers)
  formFields: GenericFormField[] = VIEW_PURCHASE_ORDER_FIELDS;

  // Datos de la orden de compra
  purchaseOrderData?: any;
  purchaseOrderDetails: any[] = [];

  // Estado
  purchaseOrderId!: number;
  loading = false;
  saving = false;
  isEditMode = false;
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;
  showDetailsPanel = true;


  private dialogConfig: DynamicDialogConfig | null = null;
  private dialogRef: DynamicDialogRef | null = null;

  /**
   * Constructor
   */
  constructor(
    private purchaseOrdersService: PurchaseOrdersService,
    private purchaseOrderDetailsService: PurchaseOrderDetailsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrumbService: BreadcrumbService,
    private suppliersService: SuppliersService,
    private authService: AuthService
  ) {
    // Inyectar opcionales para cuando está en modal
    this.dialogConfig = inject(DynamicDialogConfig, { optional: true });
    this.dialogRef = inject(DynamicDialogRef, { optional: true });
  }

  /**
   * Determina si está siendo usado como pantalla (no modal)
   */
  get isStandalonePage(): boolean {
    return !this.dialogConfig;
  }


  /**
   * Inicialización del componente
   */
  ngOnInit(): void {
    // Si está en modal, obtener datos del config
    if (this.dialogConfig?.data) {
      this.purchaseOrderId = this.dialogConfig.data.purchaseOrderId;
      this.isEditMode = false; // Siempre modo lectura en este componente
    } else {
      // Si no está en modal, obtener de la ruta
      this.purchaseOrderId = +this.route.snapshot.paramMap.get('id')!;
      this.isEditMode = false; // Este componente es SOLO para ver (readonly)

      // Configurar breadcrumb
      this.breadcrumbService.setFromString(
        'Compras e inventario > Órdenes de compra > Ver',
        '/procurement-inventory/purchase-orders'
      );
    }

    // Configurar formulario (siempre modo lectura)
    this.setupFormConfig();

    // Cargar datos de la orden de compra
    this.loadPurchaseOrder();
  }

  /**
   * Configurar los campos del formulario según el modo (como suppliers)
   */
  private setupFormConfig(): void {
    const baseFields = this.isEditMode ? EDIT_PURCHASE_ORDER_FIELDS : VIEW_PURCHASE_ORDER_FIELDS;

    // Filtrar campos según el estado de la orden
    if (this.purchaseOrderData) {
      const statusRaw = this.purchaseOrderData.status_raw || this.purchaseOrderData.statusRaw;
      const isCancelled = statusRaw === 'CANCELLED';

      // Si no está cancelada, excluir el campo de motivo de cancelación
      if (!isCancelled) {
        this.formFields = baseFields.filter(field => field.name !== 'cancellation_reason');
      } else {
        this.formFields = baseFields;
      }
    } else {
      this.formFields = baseFields;
    }
  }

  /**
   * Formatea una fecha en formato DD/MM/YYYY o DD/MM/YYYY HH:mm
   * @param dateStr Fecha en formato ISO
   * @param withTime Si debe incluir hora
   */
  private formatDate(dateStr: string, withTime: boolean = false): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    if (withTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  }

  /**
   * Mapea el estado del backend a la etiqueta en español para la UI (MAYÚSCULAS)
   */
  public getStatusLabel(status?: string): string {
    if (!status) return '-';
    const s = String(status).toUpperCase();
    switch (s) {
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
      // Devolver en MAYÚSCULAS
      return String(status).toUpperCase();
    }
  }

  /**
   * Cargar datos de la orden de compra
   */
  private loadPurchaseOrder(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.purchaseOrdersService.getById(this.purchaseOrderId).subscribe({
      next: (purchaseOrder) => {
        const po: any = purchaseOrder;

        // Obtener el nombre del proveedor (soportar ambos formatos)
        const supplierName = po.supplier?.companyName || po.supplier?.company_name || '';

        // Obtener el nombre de la ubicación destino
        const destinationLocationName = po.destinationLocation?.name || po.destination_location?.name || 'Sin asignar';

        // Transformar datos para el formulario (aplanar objeto supplier)
        this.purchaseOrderData = {
          ...po,
          // conservar el estado crudo en status_raw para el badge y usar `status` para el texto del formulario
          status_raw: po.status,
          'supplier.company_name': supplierName || 'N/A',
          'destination_location.name': destinationLocationName,
          order_date: this.formatDate(po.orderDate || po.order_date),
          created_datetime: this.formatDate(po.createdDatetime || po.created_datetime, true),
          last_updated_datetime: this.formatDate(po.lastUpdatedDatetime || po.last_updated_datetime, true),
          status: this.getStatusLabel(po.status)
        };

        // Incluir cancellation_reason si el estado es CANCELLED
        if (po.status === 'CANCELLED') {
          let cancellationReason = po.cancellationReason || po.cancellation_reason || '';
          let notes = po.notes || '';

          // Si el motivo está vacío pero está en las notas, extraerlo
          if (!cancellationReason && notes) {
            // Buscar el patrón [CANCELACIÓN] o Motivo de cancelacion: en las notas
            const patterns = [
              /\[CANCELACIÓN\]\s*([^\n]+)/i,
              /\[CANCELACION\]\s*([^\n]+)/i,
              /Motivo de cancelacion:\s*([^\n]+)/i,
              /Motivo de cancelación:\s*([^\n]+)/i
            ];

            for (const pattern of patterns) {
              const match = notes.match(pattern);
              if (match) {
                cancellationReason = match[1].trim();
                // Limpiar las notas removiendo esta línea y espacios extra
                notes = notes.replace(pattern, '').replace(/\n\n+/g, '\n\n').trim();
                break;
              }
            }
          }

          this.purchaseOrderData.cancellation_reason = cancellationReason;
          // Actualizar las notas limpias
          this.purchaseOrderData.notes = notes;
        }

        // Si el backend no devolvió el nombre del proveedor pero sí el id, intentamos obtenerlo por separado.
        const supplierId = po.supplier?.id ?? po.supplierId ?? po.supplier_id ?? null;
        if (!supplierName && supplierId) {
          // Sólo intentar buscar proveedor si el usuario tiene permiso (OPERADOR_COMPRAS o ADMINISTRADOR)
          const roles = this.authService.getUserRoles();
          const canViewSupplier = roles.includes('OPERADOR_COMPRAS') || roles.includes('ADMINISTRADOR');
          if (canViewSupplier) {
            this.suppliersService.getSupplierById(supplierId).subscribe({
              next: (supplier: any) => {
                this.purchaseOrderData['supplier.company_name'] = supplier?.companyName || supplier?.company_name || 'N/A';
                this.cdr.markForCheck();
              },
              error: (err: any) => {
                if (err?.status === 403) {
                  this.showError('Acceso denegado: Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden ver información de proveedores.');
                  this.purchaseOrderData['supplier.company_name'] = 'No autorizado';
                  this.cdr.markForCheck();
                  return;
                }
                this.purchaseOrderData['supplier.company_name'] = 'N/D';
                this.cdr.markForCheck();
              }
            });
          } else {
            // Usuario no tiene permisos para consultar proveedores en backend
            this.purchaseOrderData['supplier.company_name'] = 'No autorizado (solo OPERADOR_COMPRAS o ADMINISTRADOR)';
            this.cdr.markForCheck();
          }
        }

        this.loading = false;

        // Reconfigurar campos del formulario según el estado de la orden
        this.setupFormConfig();

        // Cargar detalles de la orden
        this.loadPurchaseOrderDetails();

        this.cdr.markForCheck();
      },
      error: (error: any) => {
        // Manejo específico de 403: falta de permisos para acceder a datos relacionados (p.ej. proveedores)
        if (error?.status === 403) {
          // Mostrar alerta específica y permitir mostrar la orden sin datos del proveedor
          this.showError('Acceso denegado: Solo los roles OPERADOR_COMPRAS y ADMINISTRADOR pueden ver esta orden de compra (algunos datos se ocultaron).');

          // Intentar mostrar la información mínima si el backend devuelve cuerpo parcialmente (por seguridad usamos fallback)
          const partial: any = (error?.error && typeof error.error === 'object' && error.error.purchaseOrder)
            ? error.error.purchaseOrder
            : { id: this.purchaseOrderId, order_date: null, created_datetime: null, last_updated_datetime: null, status: null };

          this.purchaseOrderData = {
            ...partial,
            status_raw: partial.status,
            'supplier.company_name': 'No autorizado',
            order_date: partial.order_date ? this.formatDate(partial.order_date) : '',
            created_datetime: partial.created_datetime ? this.formatDate(partial.created_datetime, true) : '',
            last_updated_datetime: partial.last_updated_datetime ? this.formatDate(partial.last_updated_datetime, true) : '',
            status: this.getStatusLabel(partial.status)
          };

          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        // Otros errores genéricos
        this.showError('Error al cargar los datos de la orden de compra');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Manejar envío del formulario
   * Convierte los datos del formulario al formato esperado por el backend
   */
  onFormSubmit(formData: any): void {
    this.saving = true;
    this.cdr.markForCheck();

    // Mapear datos del formulario al DTO del backend
    const updateDTO: PurchaseOrderUpdateDTO = this.mapFormDataToDTO(formData);

    this.purchaseOrdersService.update(this.purchaseOrderId, updateDTO).subscribe({
      next: (updatedPurchaseOrder: any) => {
        this.saving = false;
        this.showSuccess('Orden de compra actualizada exitosamente');

        // Actualizar datos locales
        this.purchaseOrderData = updatedPurchaseOrder;

        // Si es standalone page, navegar de vuelta al listado
        if (this.isStandalonePage) {
          setTimeout(() => {
            this.router.navigate(['/procurement-inventory/purchase-orders']);
          }, 1500);
        } else if (this.dialogRef) {
          // Si es modal, cerrar con los datos actualizados
          setTimeout(() => {
            this.dialogRef?.close(updatedPurchaseOrder);
          }, 1500);
        }

        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.saving = false;
        this.showError(error?.error?.message || 'Error al actualizar la orden de compra');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Mapear datos del formulario al DTO esperado por el backend
   * Solo envía status y notes (según especificación del backend)
   */
  private mapFormDataToDTO(formData: any): PurchaseOrderUpdateDTO {
    return {
      status: formData.status,
      notes: formData.notes
    };
  }

  /**
   * Manejar cancelación del formulario
   */
  onFormCancel(): void {
    if (this.isStandalonePage) {
      // Si es standalone page, navegar al listado
      this.router.navigate(['/procurement-inventory/purchase-orders']);
    } else if (this.dialogRef) {
      // Si es modal, cerrar sin cambios
      this.dialogRef.close();
    }
  }

  /**
   * Navigate back to purchase orders list
   */
  onBack(): void {
    if (this.isStandalonePage) {
      this.router.navigate(['/procurement-inventory/purchase-orders']);
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  /**
   * Mostrar mensaje de éxito
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  /**
   * Mostrar mensaje de error
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Cargar detalles de la orden de compra
   */
  private loadPurchaseOrderDetails(): void {
    this.purchaseOrderDetailsService.getByPurchaseOrder(this.purchaseOrderId).subscribe({
      next: (response: any) => {
        // Normalizar respuesta: puede ser Array directo o un objeto con content
        let detailsArray = Array.isArray(response) ? response : (response?.content || []);

        // FILTRAR SOLO DETALLES ACTIVOS - Los desactivados no deben mostrarse
        detailsArray = detailsArray.filter((detail: any) => {
          const isActive = detail.is_active ?? detail.isActive ?? detail.active ?? true;
          return isActive === true;
        });

        // Normalizar cada detalle para asegurar campos necesarios
        this.purchaseOrderDetails = detailsArray.map((detail: any) => {
          // Normalizar supplier_item (múltiples formatos posibles)
          const supplierItem = detail.supplier_item || detail.supplierItem || detail.supplieritem || {};
          const supplierItemDescription = supplierItem.description ||
                                         supplierItem.itemDescription ||
                                         supplierItem.name ||
                                         'N/D';

          // Extraer nombre limpio del supply (sin información de packaging)
          let supplyName = detail.supply?.name || supplierItem.supply?.name || 'Sin nombre';
          supplyName = supplyName
            .replace(/\s*\(CAJA\s+X\s+\d+\)\s*$/i, '')
            .replace(/\s*\(PACK\s+X\s+\d+\)\s*$/i, '')
            .replace(/\s*\(BOX\s+X\s+\d+\)\s*$/i, '')
            .replace(/\s*\(BD\s+X\s+\d+\)\s*$/i, '')
            .replace(/\s*\(UNIDAD\s+X\s+\d+\)\s*$/i, '')
            .replace(/\s*\(x\s*\d+\s*unidades?\)\s*$/i, '')
            .trim();

          // Normalizar packaging
          const packaging = detail.packaging || detail.Packaging || {};
          const unitsPerPackage = packaging.units_per_package || packaging.unitsPerPackage || 1;

          // Normalizar UOM - el backend lo devuelve en múltiples ubicaciones posibles
          const uom = detail.unitOfMeasure || detail.unit_of_measure || packaging.uom || packaging.Uom || {};
          const uomName = uom.name || uom.abbreviation || packaging.uomName || packaging.uom_name || '';

          // Construir packaging_description en formato "Unidad X cantidad"
          // Ej: "Litro X 1", "Unidad X 100", "Caja X 50"
          let packagingDescription;
          if (uomName) {
            packagingDescription = `${uomName} X ${unitsPerPackage}`;
          } else {
            packagingDescription = packaging.description || `Unidad X ${unitsPerPackage}`;
          }

          return {
            ...detail,
            // Asegurar que quantity y unit_price existen
            quantity: detail.quantity || 0,
            unit_price: detail.unit_price || detail.unitPrice || 0,
            // Calcular subtotal si no viene del backend
            subtotal: detail.subtotal || (detail.quantity || 0) * (detail.unit_price || detail.unitPrice || 0),
            // Supply name limpio
            supply_name: supplyName,
            supply: detail.supply || { name: supplyName },
            // Normalizar supplier_item (el campo más importante para la vista)
            supplier_item: {
              id: supplierItem.id || detail.supplier_item_id || detail.supplierItemId,
              description: supplierItemDescription
            },
            supplierItem: {
              id: supplierItem.id || detail.supplier_item_id || detail.supplierItemId,
              description: supplierItemDescription
            },
            // Normalizar packaging
            packaging: {
              ...packaging,
              units_per_package: unitsPerPackage,
              unitsPerPackage: unitsPerPackage,
              description: packagingDescription
            },
            packaging_description: packagingDescription,
            // Normalizar UOM
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
            uom_name: uomName
          };
        });

        this.cdr.markForCheck();
      },
      error: (error: any) => {
        // Error al cargar detalles de la orden (puede ser 500 por PackagingEntity faltante)
        this.purchaseOrderDetails = [];

        // Mostrar mensaje de error apropiado según el código de estado
        if (error?.status === 500) {
          this.showError('Error del servidor al cargar los detalles. Es posible que algunos datos relacionados no existan en la base de datos. Por favor contacte al administrador del sistema.');
        } else if (error?.status === 404) {
          // 404 es normal si no hay detalles, no mostrar error
        } else if (error?.status) {
          this.showError('Error al cargar los detalles de la orden: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Calcula el total de la orden sumando todos los subtotales
   */
  get orderTotal(): number {
    return this.purchaseOrderDetails.reduce((sum, detail) => {
      return sum + (detail.subtotal || (detail.quantity * detail.unit_price) || 0);
    }, 0);
  }

  /**
   * Calcula el total de unidades
   */
  get totalUnits(): number {
    return this.purchaseOrderDetails.reduce((sum, d) => sum + (d.quantity || 0), 0);
  }
}
