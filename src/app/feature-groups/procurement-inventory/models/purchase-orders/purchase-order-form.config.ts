import type { GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

import { GenericFormConfig, ProcurementValidationConstants } from '../form-config.model';

/**
 * Configuración del formulario genérico para Purchase Orders
 */

/**
 * Configuración para el formulario de CREAR purchase order
 * Actualizado según especificaciones del endpoint POST /api/v1/stock/purchase-orders
 */
export const CREATE_PURCHASE_ORDER_FORM_CONFIG: GenericFormConfig = {
  title: 'Crear orden de compra',
  isEditMode: false,
  showSubmitButton: false,
  showCancelButton: false,
  submitButtonLabel: 'Crear orden de compra',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      title: 'Información principal',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'supplier_id',
          label: 'Proveedor',
          type: 'select',
          placeholder: 'Seleccione el proveedor',
          required: true,
          helpText: 'Proveedor de la orden de compra',
          colSpan: 4,
          options: [] // Se cargarán dinámicamente desde el backend
        },
        {
          name: 'destination_location_id',
          label: 'Ubicación destino',
          type: 'select',
          placeholder: 'Seleccione la ubicación destino',
          required: false,
          helpText: 'Ubicación donde llegarán los insumos (opcional)',
          colSpan: 4,
          options: [] // Se cargarán dinámicamente desde el backend
        },
        {
          name: 'notes',
          label: 'Notas',
          type: 'textarea',
          placeholder: 'Notas adicionales',
          required: false,
          maxLength: ProcurementValidationConstants.MAX_OBSERVATIONS_LENGTH,
          helpText: 'Notas o comentarios sobre la orden',
          colSpan: 12
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de EDITAR purchase order
 */
export const EDIT_PURCHASE_ORDER_FORM_CONFIG: GenericFormConfig = {
  title: 'Editar orden de compra',
  isEditMode: true,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Guardar cambios',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-save',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'info',
  showValidationAlerts: true,

  sections: [
    {
      title: 'Información principal',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'id',
          label: 'ID',
          type: 'number',
          readonly: true,
          helpText: 'ID único de la orden de compra',
          colSpan: 3
        },
        {
          name: 'creationDate',
          label: 'Fecha de Creación',
          type: 'date',
          readonly: true,
          helpText: 'Fecha y hora de creación de la orden',
          colSpan: 3
        },
        {
          name: 'supplierId',
          label: 'Proveedor (ID)',
          type: 'number',
          placeholder: 'ID del proveedor',
          required: false,
          min: 1,
          helpText: 'ID del proveedor',
          colSpan: 6
        },
        {
          name: 'destinationLocationId',
          label: 'Ubicación Destino',
          type: 'select',
          placeholder: 'Seleccione la ubicación destino',
          required: true,
          helpText: 'Ubicación donde se recibirá la orden',
          colSpan: 6,
          options: [] // Se cargarán dinámicamente desde el backend
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          required: true,
          options: [
            { label: 'Pendiente', value: 'Pending' },
            { label: 'Enviada', value: 'Sent' },
            { label: 'Recibida', value: 'Received' },
            { label: 'Cancelada', value: 'Cancelled' }
          ],
          helpText: 'Estado actual de la orden de compra',
          colSpan: 6
        },
        {
          name: 'origin',
          label: 'Origen',
          type: 'select',
          required: true,
          options: [
            { label: 'Manual', value: 'Manual' },
            { label: 'Automática', value: 'Automatic' },
            { label: 'Desde solicitud', value: 'Desde Solicitud' }
          ],
          helpText: 'Tipo de origen de la orden de compra',
          colSpan: 6
        },
        {
          name: 'requestId',
          label: 'ID solicitud',
          type: 'number',
          placeholder: 'ID de la solicitud',
          required: false,
          min: 1,
          helpText: 'ID de la solicitud (requerido si origen es "Desde Solicitud")',
          colSpan: 6
        },
        {
          name: 'observations',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Observaciones adicionales',
          required: false,
          maxLength: ProcurementValidationConstants.MAX_OBSERVATIONS_LENGTH,
          helpText: 'Observaciones o notas adicionales sobre la orden',
          colSpan: 12
        }
      ]
    }
  ]
};

/**
 * Configuración para el modo VISTA (solo lectura) - Compatible con GenericFormComponent
 */
export const VIEW_PURCHASE_ORDER_FIELDS: GenericFormField[] = [
  {
    name: 'order_date',
    label: 'Fecha de orden',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1,
    transform: (value: any) => {
      if (!value) return '-';
      try {
        const date = new Date(value);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return value;
      }
    }
  },
  {
    name: 'supplier.company_name',
    label: 'Proveedor',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1
  },
  {
    name: 'status',
    label: 'Estado',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1,
    transform: (value: any) => {
      if (!value) return '-';
      // Mapear estados al español en MAYÚSCULAS
      const status = String(value).toUpperCase();
      switch (status) {
      case 'SENT': return 'ENVIADA';
      case 'CANCELLED': return 'CANCELADA';
      case 'PENDING': return 'PENDIENTE';
      case 'RECEIVED':
      case 'RECIVED': return 'RECIBIDA';
      default: return status;
      }
    }
  },
  {
    name: 'destination_location.name',
    label: 'Ubicación destino',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1
  },
  {
    name: 'cancellation_reason',
    label: 'Motivo de cancelación',
    type: 'textarea',
    disabled: true,
    readonly: true,
    colSpan: 4,
    visible: (formData: any) => {
      // Solo mostrar si el estado es CANCELLED
      const statusRaw = (formData?.status_raw || formData?.statusRaw || '').toUpperCase();
      const status = (formData?.status || '').toUpperCase();

      // Verificar explícitamente si es CANCELLED o CANCELADA
      const isCancelled = statusRaw === 'CANCELLED' ||
                         status === 'CANCELLED' ||
                         status === 'CANCELADA';

      return isCancelled;
    }
  },
  {
    name: 'notes',
    label: 'Notas',
    type: 'textarea',
    disabled: true,
    readonly: true,
    colSpan: 4
  }
];

export const EDIT_PURCHASE_ORDER_FIELDS: GenericFormField[] = [
  {
    name: 'id',
    label: 'ID',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1
  },
  {
    name: 'order_date',
    label: 'Fecha de orden',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 1,
    transform: (value: any) => {
      if (!value) return '-';
      try {
        const date = new Date(value);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return value;
      }
    }
  },
  {
    name: 'supplier.company_name',
    label: 'Proveedor',
    type: 'text',
    disabled: true,
    readonly: true,
    colSpan: 2
  },
  {
    name: 'status',
    label: 'Estado',
    type: 'select',
    required: true,
    options: [
      { label: 'PENDIENTE', value: 'PENDING' },
      { label: 'ENVIADA', value: 'SENT' },
      { label: 'RECIBIDA', value: 'RECEIVED' },
      { label: 'CANCELADA', value: 'CANCELLED' }
    ],
    colSpan: 2
  },
  {
    name: 'notes',
    label: 'Notas',
    type: 'textarea',
    required: false,
    maxLength: 500,
    colSpan: 4
  }
];

/**
 * Configuración para el modo VISTA (solo lectura) - LEGACY
 */
export const VIEW_PURCHASE_ORDER_FORM_CONFIG: GenericFormConfig = {
  title: 'Detalles de la orden de compra',
  readonly: true,
  showSubmitButton: false,
  showCancelButton: false,

  sections: [
    {
      title: 'Información principal',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'id',
          label: 'ID',
          type: 'number',
          readonly: true,
          colSpan: 3
        },
        {
          name: 'creationDate',
          label: 'Fecha de creación',
          type: 'date',
          readonly: true,
          colSpan: 3
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'text',
          readonly: true,
          colSpan: 3
        },
        {
          name: 'origin',
          label: 'Origen',
          type: 'text',
          readonly: true,
          colSpan: 3
        },
        {
          name: 'supplierId',
          label: 'Proveedor (ID)',
          type: 'number',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'destinationLocationId',
          label: 'Ubicación destino (ID)',
          type: 'number',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'requestId',
          label: 'ID Solicitud',
          type: 'number',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'observations',
          label: 'Observaciones',
          type: 'textarea',
          readonly: true,
          colSpan: 12
        }
      ]
    }
  ]
};

/**
 * Función helper para obtener la configuración según el modo
 */
export function getPurchaseOrderFormConfig(mode: 'create' | 'edit' | 'view'): GenericFormConfig {
  switch (mode) {
  case 'create':
    return CREATE_PURCHASE_ORDER_FORM_CONFIG;
  case 'edit':
    return EDIT_PURCHASE_ORDER_FORM_CONFIG;
  case 'view':
    return VIEW_PURCHASE_ORDER_FORM_CONFIG;
  default:
    return VIEW_PURCHASE_ORDER_FORM_CONFIG;
  }
}
