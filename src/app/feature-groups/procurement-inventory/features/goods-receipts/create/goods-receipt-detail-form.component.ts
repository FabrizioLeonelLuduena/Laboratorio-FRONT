import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';

import { MessageService } from 'primeng/api';

import { GenericDynamicFormComponent, DynamicFormField, DynamicSelectOption } from '../../../../../shared/components/generic-dynamic-form/generic-dynamic-form.component';
import { BatchesService } from '../../../services/batches.service';

/** Interface representing a batch search result */
interface BatchSearchResult {
  id: number;
  batchNumber: string;
  expirationDate: string;
  notes?: string;
  supplierItemId?: number;
  displayLabel?: string;
}

/**
 * GoodsReceiptDetailFormComponent
 *
 * Versión mejorada del formulario de detalles de recepción usando el formulario dinámico genérico.
 * Ofrece mayor flexibilidad y funcionalidades avanzadas como campos condicionales y validación cruzada.
 */
@Component({
  selector: 'pi-goods-receipt-detail-form',
  standalone: true,
  imports: [
    CommonModule,
    GenericDynamicFormComponent
  ],
  template: `
    <app-generic-dynamic-form
      [fields]="formFields"
      [title]="'Agregar Item a la Recepción'"
      [saving]="false"
      (submitForm)="onFormSubmit($event)"
      (cancelForm)="onFormCancel()"
      (fieldChange)="onFieldChange($event)"
    />
  `
})
export class GoodsReceiptDetailFormComponent implements OnChanges {
  @Input() supplierItems: any[] = [];
  @Output() save = new EventEmitter<any>();

  formFields: DynamicFormField[] = [];
  private batchOptions: DynamicSelectOption[] = [];
  private selectedExistingBatch: BatchSearchResult | null = null;

  private batchesService = inject(BatchesService);
  private messageService = inject(MessageService);

  /**
   * Angular lifecycle hook: actualizar campos cuando cambien los inputs
   */
  ngOnChanges(_changes: SimpleChanges): void {
    this.buildFormFields();
    this.loadAllBatches();
  }

  /**
   * Construir la configuración de campos del formulario dinámico
   */
  private buildFormFields(): void {
    const supplierItemOptions: DynamicSelectOption[] = (this.supplierItems || []).map((item: any) => ({
      label: item.name || `${item.itemCode} - ${item.description}`,
      value: item.id
    }));

    this.formFields = [
      {
        name: 'supplierItemId',
        label: 'Item del Proveedor',
        type: 'select',
        options: supplierItemOptions,
        placeholder: 'Seleccione un item',
        required: true,
        colSpan: 2
      },

      {
        name: 'requestedQuantity',
        label: 'Cantidad Solicitada',
        type: 'number',
        min: 0,
        colSpan: 1,
        hint: 'Cantidad originalmente solicitada'
      },
      {
        name: 'receivedQuantity',
        label: 'Cantidad Recibida',
        type: 'number',
        min: 1,
        required: true,
        colSpan: 1,
        hint: 'Cantidad efectivamente recibida'
      },

      {
        name: 'batchSearch',
        label: 'Lote',
        type: 'select',
        options: this.batchOptions,
        placeholder: 'Seleccione un lote existente o cree uno nuevo...',
        colSpan: 2,
        hint: 'Busque por número de lote o seleccione "Crear nuevo lote"',
        filter: true,
        filterBy: 'label',
        filterPlaceholder: 'Buscar por número de lote...'
      },

      {
        name: 'expirationDate',
        label: 'Fecha de Expiración',
        type: 'date',
        colSpan: 1,
        visibilityCondition: (formValue) => this.shouldShowNewBatchFields(formValue),
        requiredCondition: (formValue) => this.shouldShowNewBatchFields(formValue),
        hint: 'Requerida para lotes nuevos'
      },
      {
        name: 'batchNotes',
        label: 'Notas del Lote',
        type: 'textarea',
        rows: 2,
        colSpan: 1,
        visibilityCondition: (formValue) => this.shouldShowNewBatchFields(formValue),
        placeholder: 'Notas adicionales del lote...'
      },

      // Observaciones del Item
      {
        name: 'notes',
        label: 'Observaciones del Item',
        type: 'textarea',
        rows: 2,
        colSpan: 2,
        placeholder: 'Observaciones sobre este item en la recepción...'
      }
    ];
  }

  /**
   * Determinar si se deben mostrar los campos de lote nuevo
   */
  private shouldShowNewBatchFields(formValue: Record<string, any>): boolean {
    const batchSearch = formValue?.['batchSearch'];

    if (!batchSearch) return false;

    if (batchSearch === 'NEW_BATCH') return true;

    if (batchSearch && typeof batchSearch === 'object' && batchSearch.id) {
      return false;
    }

    return false;
  }

  /**
   * Manejar cambios en los campos del formulario
   */
  onFieldChange(event: any): void {
    if (event.fieldName === 'batchSearch') {
      this.handleBatchSelection(event.value);
    }
  }

  /**
   * Manejar selección de lote (existente o nuevo)
   */
  private handleBatchSelection(selectedValue: any): void {
    if (selectedValue === 'NEW_BATCH') {
      this.selectedExistingBatch = null;
      this.messageService.add({
        severity: 'info',
        summary: 'Nuevo lote',
        detail: 'Complete los campos de fecha de expiración y notas para crear un nuevo lote.'
      });
    } else if (selectedValue && typeof selectedValue === 'object' && selectedValue.id) {
      this.selectedExistingBatch = selectedValue;
      this.messageService.add({
        severity: 'success',
        summary: 'Lote seleccionado',
        detail: `Lote existente: ${selectedValue.batchNumber}`
      });
    } else {
      this.selectedExistingBatch = null;
    }
  }

  /**
   * Manejar búsqueda de lotes
   */
  private handleBatchSearch(query: string): void {
    if (!query || query.length < 2) {
      this.batchOptions = [];
      this.updateBatchSearchOptions();
      return;
    }

    this.batchesService.searchBatches({
      batchNumber: query,
      size: 10,
      isActive: true
    }).subscribe({
      next: (response: any) => {
        let batches: any[] = [];
        if (Array.isArray(response)) {
          batches = response;
        } else if (response?.content && Array.isArray(response.content)) {
          batches = response.content;
        } else if (response?.data && Array.isArray(response.data)) {
          batches = response.data;
        }

        // Convertir lotes a opciones del formulario
        this.batchOptions = batches.map((batch: any) => ({
          label: `${batch.batchNumber || batch.batch_number} (Vence: ${this.formatDate(batch.expirationDate || batch.expiration_date)})`,
          value: {
            id: batch.id || batch.batchId || batch.batch_id,
            batchNumber: batch.batchNumber || batch.batch_number,
            expirationDate: batch.expirationDate || batch.expiration_date,
            notes: batch.notes || batch.batch_notes
          }
        }));

        this.updateBatchSearchOptions();
      },
      error: () => {
        this.batchOptions = [];
        this.updateBatchSearchOptions();
        this.messageService.add({
          severity: 'warn',
          summary: 'Búsqueda de lotes',
          detail: 'No se pudieron cargar los lotes. Puede escribir un número manualmente.'
        });
      }
    });
  }

  /**
   * Cargar todos los lotes disponibles para el select
   */
  private loadAllBatches(): void {
    this.batchesService.searchBatches({
      batchNumber: '', // Sin filtro para obtener todos
      size: 100, // Aumentar tamaño para obtener más lotes
      isActive: true
    }).subscribe({
      next: (response: any) => {
        let batches: any[] = [];
        if (Array.isArray(response)) {
          batches = response;
        } else if (response?.content && Array.isArray(response.content)) {
          batches = response.content;
        } else if (response?.data && Array.isArray(response.data)) {
          batches = response.data;
        }

        this.batchOptions = batches.map((batch: any) => ({
          label: `${batch.batchNumber || batch.batch_number} (Vence: ${this.formatDate(batch.expirationDate || batch.expiration_date)})`,
          value: {
            id: batch.id || batch.batchId || batch.batch_id,
            batchNumber: batch.batchNumber || batch.batch_number,
            expirationDate: batch.expirationDate || batch.expiration_date,
            notes: batch.notes || batch.batch_notes
          }
        }));

        this.batchOptions.push({
          label: '+ Crear nuevo lote',
          value: 'NEW_BATCH'
        });

        this.updateBatchSearchOptions();
      },
      error: () => {
        this.batchOptions = [];
        this.updateBatchSearchOptions();
        this.messageService.add({
          severity: 'warn',
          summary: 'Error al cargar lotes',
          detail: 'No se pudieron cargar los lotes disponibles.'
        });
      }
    });
  }

  /**
   * Actualizar las opciones del campo de búsqueda de lotes
   */
  private updateBatchSearchOptions(): void {
    const batchField = this.formFields.find(f => f.name === 'batchSearch');
    if (batchField) {
      batchField.options = this.batchOptions;
    }
  }

  /**
   * Manejar envío del formulario
   */
  onFormSubmit(formValue: Record<string, any>): void {
    const detailData: any = {
      supplierItemId: formValue['supplierItemId'],
      requestedQuantity: formValue['requestedQuantity'] || 0,
      receivedQuantity: formValue['receivedQuantity'],
      notes: formValue['notes']?.trim() || undefined
    };

    // Manejar lote existente vs nuevo
    const batchSearch = formValue['batchSearch'];

    if (batchSearch === 'NEW_BATCH') {
      // Crear nuevo lote - necesita campos adicionales
      if (!formValue['expirationDate']) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Fecha requerida',
          detail: 'Debe especificar la fecha de expiración para el lote nuevo.'
        });
        return;
      }

      // Solicitar número de lote nuevo al usuario
      const batchNumber = prompt('Ingrese el número para el nuevo lote:');
      if (!batchNumber || !batchNumber.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Número de lote requerido',
          detail: 'Debe especificar un número para el nuevo lote.'
        });
        return;
      }

      detailData.batchNumber = batchNumber.trim();
      detailData.expirationDate = this.formatDateForBackend(formValue['expirationDate']);
      if (formValue['batchNotes']?.trim()) {
        detailData.batchNotes = formValue['batchNotes'].trim();
      }
    } else if (batchSearch && typeof batchSearch === 'object' && batchSearch.id) {
      // Lote existente seleccionado
      detailData.batchId = Number(batchSearch.id);
      this.selectedExistingBatch = batchSearch;
    } else {
      // No hay lote seleccionado - opcional según requerimientos
      // Se puede omitir el lote si no es obligatorio
    }

    this.save.emit(detailData);
    this.resetForm();
  }

  /**
   * Manejar cancelación del formulario
   */
  onFormCancel(): void {
    this.resetForm();
  }

  /**
   * Reiniciar formulario
   */
  private resetForm(): void {
    this.selectedExistingBatch = null;
    this.batchOptions = [];
    this.buildFormFields();
  }

  /**
   * Formatear fecha para mostrar (es-AR locale)
   */
  private formatDate(date: string | Date): string {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatear fecha para backend (yyyy-MM-dd)
   */
  private formatDateForBackend(date: Date | string | null): string {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
