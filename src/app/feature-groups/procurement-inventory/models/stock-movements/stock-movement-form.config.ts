/**
 * Configuración del formulario genérico para Stock Movements
 * Defines configurations for creating different types of stock movements
 */

import { StockMovementType } from '../../enums/movementType.enum';
import { GenericFormConfig } from '../form-config.model';

/**
 * Configuración para el formulario de INGRESO/PURCHASE
 */
export const CREATE_PURCHASE_FORM_CONFIG: GenericFormConfig = {
  title: 'Ingreso de Stock',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Guardar Movimiento',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      icon: 'pi pi-plus-circle',
      fields: [
        {
          name: 'supplierId',
          label: 'Proveedor',
          type: 'select',
          placeholder: 'Seleccione un proveedor',
          required: true,
          helpText: 'Seleccione el proveedor responsable del ingreso',
          colSpan: 3,
          options: []
        },
        {
          name: 'originLocationId',
          label: 'Ubicación de almacenamiento',
          type: 'select',
          placeholder: 'Seleccione Área y Rack',
          required: true,
          helpText: 'Ubicación donde se almacenará el stock ingresado',
          colSpan: 3,
          options: []
        },
        {
          name: 'justification',
          label: 'Justificación',
          type: 'textarea',
          placeholder: 'Detalle la justificación del ingreso',
          required: true,
          maxLength: 500,
          colSpan: 4
        },
        {
          name: 'reason',
          label: 'Motivo',
          type: 'text',
          placeholder: 'Ej: Reposición mensual',
          maxLength: 50,
          colSpan: 3
        },
        {
          name: 'notes',
          label: 'Notas generales',
          type: 'textarea',
          placeholder: 'Observaciones del movimiento',
          maxLength: 500,
          colSpan: 3
        }
      ]
    },
    {
      icon: 'pi pi-list',
      fields: [
        {
          name: 'details',
          label: 'Detalles',
          type: 'array',
          addButtonLabel: 'Agregar Detalle',
          helpText: 'Agregá al menos un insumo con su cantidad y lote',
          colSpan: 12,
          arrayMinItems: 1,
          arrayFields: [
            {
              name: 'supplyId',
              label: 'Producto',
              type: 'select',
              placeholder: 'Seleccioná un producto',
              required: true,
              showInSummary: true,
              options: []
            },
            {
              name: 'quantity',
              label: 'Cantidad',
              type: 'number',
              placeholder: 'Ej: 100',
              required: true,
              showInSummary: true
            },
            {
              name: 'batchNumber',
              label: 'Nro Lote',
              type: 'text',
              placeholder: 'L-001'
            },
            {
              name: 'expirationDate',
              label: 'Fecha Expiración (YYYY-MM-DD)',
              type: 'text',
              placeholder: '2026-01-01'
            },
            {
              name: 'notes',
              label: 'Notas',
              type: 'text',
              placeholder: 'Observaciones del detalle'
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de TRANSFERENCIA/TRANSFER
 */
export const CREATE_TRANSFER_FORM_CONFIG: GenericFormConfig = {
  title: 'Transferencia de Stock',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Guardar Movimiento',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      icon: 'pi pi-arrows-h',
      fields: [
        {
          name: 'originLocationId',
          label: 'Ubicación de Origen',
          type: 'select',
          placeholder: 'Seleccione Área y Rack de origen',
          required: true,
          colSpan: 12,
          options: []
        },
        {
          name: 'locationId',
          label: 'Ubicación de Destino',
          type: 'select',
          placeholder: 'Seleccione Área y Rack de destino',
          required: true,
          colSpan: 12,
          options: []
        },
        {
          name: 'justification',
          label: 'Justificación',
          type: 'textarea',
          placeholder: 'Detalle por qué se realiza la transferencia',
          required: true,
          maxLength: 500,
          colSpan: 12
        },
        {
          name: 'reason',
          label: 'Motivo',
          type: 'text',
          placeholder: 'Ej: Reubicación de stock',
          maxLength: 50,
          colSpan: 6
        },
        {
          name: 'notes',
          label: 'Notas generales',
          type: 'textarea',
          placeholder: 'Observaciones del movimiento',
          maxLength: 500,
          colSpan: 12
        },
        {
          name: 'userId',
          label: 'Usuario',
          type: 'text',
          defaultValue: '',
          readonly: true,
          colSpan: 12
        }
      ]
    },
    {
      icon: 'pi pi-list',
      fields: [
        {
          name: 'details',
          label: 'Detalles',
          type: 'array',
          addButtonLabel: 'Agregar Detalle',
          helpText: 'Agregá cada insumo con la cantidad a transferir',
          colSpan: 12,
          arrayMinItems: 1,
          arrayFields: [
            {
              name: 'supplyId',
              label: 'Producto',
              type: 'select',
              placeholder: 'Seleccioná un producto',
              required: true,
              showInSummary: true,
              options: []
            },
            {
              name: 'quantity',
              label: 'Cantidad',
              type: 'number',
              placeholder: 'Ej: 20',
              required: true,
              showInSummary: true
            },
            {
              name: 'batchNumber',
              label: 'Nro Lote',
              type: 'text',
              placeholder: 'Identificador de lote'
            },
            {
              name: 'notes',
              label: 'Notas',
              type: 'text',
              placeholder: 'Observaciones del detalle'
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de AJUSTE/ADJUSTMENT
 */
export const CREATE_ADJUSTMENT_FORM_CONFIG: GenericFormConfig = {
  title: 'Ajuste de Inventario',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Guardar Movimiento',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      icon: 'pi pi-sliders-h',
      fields: [
        {
          name: 'locationId',
          label: 'Ubicación',
          type: 'select',
          placeholder: 'Seleccione Área y Rack',
          required: true,
          colSpan: 12,
          options: []
        },
        {
          name: 'justification',
          label: 'Justificación',
          type: 'textarea',
          placeholder: 'Ingrese la justificación del ajuste (obligatorio)',
          required: true,
          maxLength: 500,
          helpText: 'La justificación es obligatoria para ajustes',
          colSpan: 12
        },
        {
          name: 'reason',
          label: 'Motivo',
          type: 'text',
          placeholder: 'Ej: Inventario físico',
          maxLength: 50,
          colSpan: 6
        },
        {
          name: 'notes',
          label: 'Notas generales',
          type: 'textarea',
          placeholder: 'Observaciones adicionales',
          maxLength: 500,
          colSpan: 12
        },
        {
          name: 'userId',
          label: 'Usuario',
          type: 'text',
          defaultValue: '',
          readonly: true,
          colSpan: 12
        }
      ]
    },
    {
      icon: 'pi pi-list',
      fields: [
        {
          name: 'details',
          label: 'Detalles',
          type: 'array',
          addButtonLabel: 'Agregar Detalle',
          helpText: 'Indicá qué insumos se ajustan y en qué cantidad',
          colSpan: 12,
          arrayMinItems: 1,
          arrayFields: [
            {
              name: 'supplyId',
              label: 'Producto',
              type: 'select',
              placeholder: 'Seleccioná un producto',
              required: true,
              showInSummary: true,
              options: []
            },
            {
              name: 'quantity',
              label: 'Cantidad (+/-)',
              type: 'number',
              placeholder: 'Ej: -5',
              required: true,
              showInSummary: true
            },
            {
              name: 'batchNumber',
              label: 'Nro Lote',
              type: 'text',
              placeholder: 'Identificador de lote'
            },
            {
              name: 'expirationDate',
              label: 'Fecha Expiración (YYYY-MM-DD)',
              type: 'text',
              placeholder: '2026-01-01'
            },
            {
              name: 'notes',
              label: 'Notas',
              type: 'text',
              placeholder: 'Observaciones del detalle'
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de DEVOLUCIÓN/RETURN
 */
export const CREATE_RETURN_FORM_CONFIG: GenericFormConfig = {
  title: 'Egreso de mercadería',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Registrar egreso',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      icon: 'pi pi-replay',
      fields: [
        {
          name: 'supplierId',
          label: 'Proveedor',
          type: 'select',
          placeholder: 'Seleccione un proveedor',
          required: true,
          helpText: 'Proveedor al que se devolverá el producto',
          colSpan: 6,
          options: []
        },
        {
          name: 'locationId',
          label: 'Ubicación',
          type: 'select',
          placeholder: 'Seleccione Área y Rack',
          required: true,
          helpText: 'Ubicación donde se registrará la devolución',
          colSpan: 6,
          options: []
        },
        {
          name: 'justification',
          label: 'Justificación de la Devolución',
          type: 'textarea',
          placeholder: 'Ingrese la justificación de la devolución (defecto, vencimiento, etc.)',
          required: true,
          maxLength: 500,
          helpText: 'Justificación obligatoria de la devolución',
          colSpan: 12
        },
        {
          name: 'reason',
          label: 'Motivo',
          type: 'text',
          placeholder: 'Ej: Material defectuoso',
          maxLength: 50,
          colSpan: 6
        },
        {
          name: 'notes',
          label: 'Notas generales',
          type: 'textarea',
          placeholder: 'Observaciones adicionales',
          maxLength: 500,
          colSpan: 12
        }
      ]
    },
    {
      icon: 'pi pi-list',
      fields: [
        {
          name: 'details',
          label: 'Detalles',
          type: 'array',
          addButtonLabel: 'Agregar Detalle',
          helpText: 'Ingresá cada insumo a devolver con su lote y cantidad',
          colSpan: 12,
          arrayMinItems: 1,
          arrayFields: [
            {
              name: 'supplyId',
              label: 'Producto',
              type: 'select',
              placeholder: 'Seleccioná un producto',
              required: true,
              showInSummary: true,
              options: []
            },
            {
              name: 'quantity',
              label: 'Cantidad a devolver',
              type: 'number',
              placeholder: 'Ej: 10',
              required: true,
              showInSummary: true
            },
            {
              name: 'batchNumber',
              label: 'Nro Lote',
              type: 'text',
              placeholder: 'Lote requerido',
              required: true
            },
            {
              name: 'expirationDate',
              label: 'Fecha Expiración (YYYY-MM-DD)',
              type: 'text',
              placeholder: '2026-01-01'
            },
            {
              name: 'notes',
              label: 'Notas',
              type: 'text',
              placeholder: 'Observaciones del detalle'
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Función helper para obtener la configuración según el tipo de movimiento
 */
export function getStockMovementFormConfig(movementType: StockMovementType): GenericFormConfig {
  switch (movementType) {
  case StockMovementType.PURCHASE:
    return CREATE_PURCHASE_FORM_CONFIG;
  case StockMovementType.TRANSFER:
    return CREATE_TRANSFER_FORM_CONFIG;
  case StockMovementType.ADJUSTMENT:
    return CREATE_ADJUSTMENT_FORM_CONFIG;
  case StockMovementType.RETURN:
    return CREATE_RETURN_FORM_CONFIG;
  default:
    return CREATE_PURCHASE_FORM_CONFIG;
  }
}
