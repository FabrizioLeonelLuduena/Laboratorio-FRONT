/* eslint-disable import/order */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';

import { SupplierItemsService } from '../../services/supplier-items/supplier-items.service';

/**
 * Componente para agregar una línea de detalle a una orden de compra.
 * - Carga los items disponibles para el supplier seleccionado
 * - Permite elegir un item, ajustar cantidad y precio unitario
 * - Autocompleta supply_id, unit_of_measure_id, packaging_id al seleccionar un supplier item
 * - Calcula subtotal (cantidad * precio) en tiempo real
 */
@Component({
  selector: 'pi-detail-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    PanelModule
  ],
  templateUrl: './detail-entry.component.html'
})
export class DetailEntryComponent {
  /** Emite el detalle agregado con todos los campos requeridos */
  @Output() save = new EventEmitter<Record<string, any>>();

  form: FormGroup;
  filteredSupplierItems: any[] = [];
  public supplierItemsService = inject(SupplierItemsService);

  // Input desde el padre: supplierId (opcional)
  private _supplierId?: number | null = null;
  /**
   * Setter para el ID del proveedor.
   * Cuando cambia el valor, se recargan los items relacionados con ese proveedor.
   * @param v - ID del proveedor (number) o null/undefined para limpiar
   */
  @Input()
  set supplierId(v: number | null | undefined) {
    this._supplierId = v ?? null;
    this.loadSupplierItems();
  }
  /**
   * Getter para el ID del proveedor actualmente seleccionado.
   * @returns ID del proveedor o null si no está establecido
   */
  get supplierId(): number | null | undefined {
    return this._supplierId;
  }

  /** Constructor: crea el FormGroup del formulario de detalle */
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      supplier_item_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      // Campos autocompletados que serán establecidos al seleccionar el supplier_item
      supply_id: [null, Validators.required],
      unit_of_measure_id: [null, Validators.required],
      packaging_id: [null, Validators.required]
    });

    // Actualizar subtotal cuando cambian cantidad o precio
    this.form.get('quantity')?.valueChanges.subscribe(() => {
      // Trigger change detection for subtotal
    });
    this.form.get('unit_price')?.valueChanges.subscribe(() => {
      // Trigger change detection for subtotal
    });
  }

  /**
   * Guarda el detalle si el formulario es válido y emite el objeto normalizado.
   */
  onSave(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    // Encontrar el supplier item completo
    const selectedItem = this.filteredSupplierItems.find(item => item.id === v.supplier_item_id);

    const payload: any = {
      supplier_item_id: v.supplier_item_id,
      supply_id: v.supply_id,
      unit_of_measure_id: v.unit_of_measure_id,
      packaging_id: v.packaging_id,
      quantity: Number(v.quantity),
      unit_price: Number(v.unit_price),
      // Datos adicionales para mostrar en la tabla
      supplier_item_name: selectedItem?.name || selectedItem?.label || `Item #${v.supplier_item_id}`,
      supply_name: selectedItem?.raw?.supply?.name || null,
      unit_of_measure_name: selectedItem?.raw?.unitOfMeasure?.name || null,
      packaging_info: selectedItem?.raw?.packaging
        ? `${selectedItem.raw.packaging.units_per_package} x ${selectedItem.raw.packaging.uom_name || 'unidades'}`
        : null
    };

    this.save.emit(payload);

    // Reset form
    this.form.reset({
      supplier_item_id: null,
      quantity: 1,
      unit_price: 0,
      supply_id: null,
      unit_of_measure_id: null,
      packaging_id: null
    });
  }

  /** Handler cuando se selecciona un supplier item por ID */
  onSupplierItemSelected(itemId: any): void {
    if (!itemId) {
      // Reset autocompletados si se limpia la selección
      this.form.patchValue({
        supply_id: null,
        unit_of_measure_id: null,
        packaging_id: null,
        unit_price: 0
      });
      return;
    }

    // Buscar el item completo
    const item = this.filteredSupplierItems.find(i => i.id === itemId);
    if (!item) return;

    this.onSupplierItemChange(item);
  }

  /** Handler cuando se selecciona un supplier item en el dropdown - AUTOCOMPLETA CAMPOS */
  onSupplierItemChange(item: any): void {
    if (!item) {
      // Reset autocompletados si se limpia la selección
      this.form.patchValue({
        supply_id: null,
        unit_of_measure_id: null,
        packaging_id: null,
        unit_price: 0
      });
      return;
    }

    // AUTOCOMPLETA: precio unitario
    const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;

    // AUTOCOMPLETA: supply_id (del raw si está disponible)
    const supplyId = item.supply_id ?? item.raw?.supply_id ?? item.raw?.supply?.id ?? item.supplyId ?? null;

    // AUTOCOMPLETA: unit_of_measure_id
    const uomId =
      item.unit_of_measure_id ?? item.raw?.unit_of_measure_id ?? item.raw?.unitOfMeasure?.id ?? item.unitOfMeasureId ?? null;

    // AUTOCOMPLETA: packaging_id
    const packagingId =
      item.packaging_id ?? item.raw?.packaging_id ?? item.raw?.packaging?.id ?? item.packagingId ?? null;

    // Actualizar formulario con valores autocompletados
    this.form.patchValue({
      supply_id: supplyId,
      unit_of_measure_id: uomId,
      packaging_id: packagingId,
      unit_price: unitPrice
    });

    // RECALCULAR SUBTOTAL automáticamente (el getter ya lo hace)
  }

  /**
   * Carga los items asociados al supplier actual desde el backend.
   * El servicio ya devuelve items normalizados.
   */
  private loadSupplierItems(): void {
    if (!this._supplierId) {
      this.filteredSupplierItems = [];
      // Reset form cuando no hay supplier
      this.form.patchValue({
        supplier_item_id: null,
        supply_id: null,
        unit_of_measure_id: null,
        packaging_id: null,
        unit_price: 0
      });
      return;
    }

    this.supplierItemsService.getBySupplier(this._supplierId).subscribe({
      next: (list: any[]) => {
        // El servicio ya normaliza los items con { id, name, unit_price, supply_id, etc. }
        this.filteredSupplierItems = list || [];
      },
      error: (_err: any) => {
        this.filteredSupplierItems = [];
        // El error ya está registrado en supplierItemsService.lastAttempts
      }
    });
  }


  /** Devuelve el subtotal actual basado en cantidad y precio unitario. */
  get subtotal(): number {
    const q = Number(this.form.get('quantity')?.value || 0);
    const p = Number(this.form.get('unit_price')?.value || 0);
    return q * p;
  }

  /** Cancela y resetea el formulario */
  onCancel(): void {
    this.form.reset({
      supplier_item_id: null,
      quantity: 1,
      unit_price: 0,
      supply_id: null,
      unit_of_measure_id: null,
      packaging_id: null
    });
  }

  /** Obtiene el nombre de la unidad de medida del item seleccionado */
  getUnitOfMeasureName(): string {
    const itemId = this.form.get('supplier_item_id')?.value;
    if (!itemId) return '';

    const item = this.filteredSupplierItems.find(i => i.id === itemId);
    return item?.raw?.unitOfMeasure?.name || item?.raw?.unit_of_measure_name || '-';
  }

  /** Obtiene la información del empaque del item seleccionado */
  getPackagingInfo(): string {
    const itemId = this.form.get('supplier_item_id')?.value;
    if (!itemId) return '';

    const item = this.filteredSupplierItems.find(i => i.id === itemId);
    if (item?.raw?.packaging) {
      const pkg = item.raw.packaging;
      return `${pkg.units_per_package || ''} ${pkg.uom_name || 'unidades'}`.trim();
    }
    return '-';
  }
}
