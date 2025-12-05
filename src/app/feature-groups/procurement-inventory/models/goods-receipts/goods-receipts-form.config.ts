/**
 * Configuración del formulario genérico para Delivery Notes (Goods Receipts)
 * Define la configuración para crear notas de entrega
 */

import { GenericFormConfig } from '../form-config.model';

import { DeliveryNoteStatus } from './goods-receipts.models';

/**
 * Configuración para el formulario de CREAR delivery note
 */
export const CREATE_DELIVERY_NOTE_FORM_CONFIG: GenericFormConfig = {
  title: 'Nueva Nota de Entrega',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Crear Nota de Entrega',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      title: 'Información General',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'purchaseOrderId',
          label: 'Orden de Compra',
          type: 'select',
          placeholder: 'Seleccione una orden de compra',
          required: true,
          helpText: 'Seleccione la orden de compra asociada',
          colSpan: 6,
          options: [] // Se llenarán dinámicamente
        },
        {
          name: 'supplierId',
          label: 'Proveedor',
          type: 'select',
          placeholder: 'Seleccione un proveedor',
          required: true,
          helpText: 'Seleccione el proveedor de la mercadería',
          colSpan: 6,
          options: [] // Se llenarán dinámicamente
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          required: true,
          defaultValue: DeliveryNoteStatus.PENDING,
          helpText: 'Estado actual de la nota de entrega',
          colSpan: 6,
          options: [
            { label: 'Pendiente', value: DeliveryNoteStatus.PENDING },
            { label: 'Recibida', value: DeliveryNoteStatus.RECEIVED },
            { label: 'Devuelta', value: DeliveryNoteStatus.RETURNED },
            { label: 'Cancelada', value: DeliveryNoteStatus.CANCELLED }
          ]
        },
        {
          name: 'receiptDate',
          label: 'Fecha de Recepción',
          type: 'date',
          required: true,
          defaultValue: new Date(),
          helpText: 'Fecha en que se recibió la mercadería',
          colSpan: 6
        },
        {
          name: 'notes',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Ingrese observaciones adicionales...',
          required: false,
          helpText: 'Comentarios adicionales sobre la entrega',
          colSpan: 12
        }
      ]
    },
    {
      title: 'Detalles de Items Recibidos',
      icon: 'pi pi-list',
      fields: [
        {
          name: 'supplierItemId1',
          label: 'Item del Proveedor',
          type: 'select',
          placeholder: 'Seleccione un item',
          required: true,
          helpText: 'Seleccione el item recibido del proveedor',
          colSpan: 8,
          options: [] // Se llenarán dinámicamente
        },
        {
          name: 'receivedQuantity1',
          label: 'Cantidad Recibida',
          type: 'number',
          placeholder: '0',
          required: true,
          helpText: 'Cantidad de items recibidos',
          colSpan: 4,
          min: 1
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de EDITAR delivery note
 */
export const EDIT_DELIVERY_NOTE_FORM_CONFIG: GenericFormConfig = {
  ...CREATE_DELIVERY_NOTE_FORM_CONFIG,
  title: 'Editar Nota de Entrega',
  isEditMode: true,
  submitButtonLabel: 'Actualizar Nota de Entrega'
};
