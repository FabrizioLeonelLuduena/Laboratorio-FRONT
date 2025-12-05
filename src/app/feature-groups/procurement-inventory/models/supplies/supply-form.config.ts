/**
 * Configuración del formulario genérico para Supplies
 */

import { GenericFormConfig } from '../form-config.model';

import {
  SupplyCategoryEnum,
  UnitOfMeasure,
  translateCategory,
  translateUnitOfMeasure
} from './supplies.model'; // Importar enums y funciones de traducción

/**
 * Configuración para el formulario de CREAR supply
 */
export const CREATE_SUPPLY_FORM_CONFIG: GenericFormConfig = {
  title: 'Crear Insumo',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Crear Insumo',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      title: '',
      icon: undefined,
      fields: [
        {
          name: 'name',
          label: 'Nombre del Insumo',
          type: 'text',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'category',
          label: 'Categoría',
          type: 'select', // Cambiado a select
          readonly: false,
          colSpan: 6,
          options: Object.values(SupplyCategoryEnum).map(value => ({
            label: translateCategory(value),
            value: value
          })),
          formatFn: (value: string) => translateCategory(value)
        },
        {
          name: 'supplyTypeId', // Cambiado a supply_type_id para enviar el ID
          label: 'Tipo de Insumo',
          type: 'select', // Cambiado a select
          readonly: false,
          colSpan: 6,
          formatFn: (value: number) => {
            // Necesitaríamos un mapeo de ID a nombre para la visualización
            // Por ahora, si el valor es un número, no lo traducimos directamente sin el mapeo
            return value ? value.toString() : '';
          }
        },
        {
          name: 'unitOfMeasure',
          label: 'Unidad de Medida',
          type: 'select', // Cambiado a select
          readonly: false,
          colSpan: 6,
          options: Object.values(UnitOfMeasure).map(value => ({
            label: translateUnitOfMeasure(value),
            value: value
          })),
          formatFn: (value: string) => translateUnitOfMeasure(value)
        },
        {
          name: 'minimumStock',
          label: 'Stock Mínimo',
          type: 'number',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'maximumStock',
          label: 'Stock Máximo',
          type: 'number',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          readonly: false,
          colSpan: 12
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de EDITAR supply
 */
export const EDIT_SUPPLY_FORM_CONFIG: GenericFormConfig = {
  title: 'Editar Insumo',
  isEditMode: true,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Guardar Cambios',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-save',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'info',
  showValidationAlerts: true,

  sections: [
    {
      title: '',
      icon: undefined,
      fields: [
        {
          name: 'name',
          label: 'Nombre del Insumo',
          type: 'text',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'category',
          label: 'Categoría',
          type: 'select', // Cambiado a select
          readonly: false,
          colSpan: 6,
          options: Object.values(SupplyCategoryEnum).map(value => ({
            label: translateCategory(value),
            value: value
          })),
          formatFn: (value: string) => translateCategory(value)
        },
        {
          name: 'unitOfMeasure',
          label: 'Unidad de Medida',
          type: 'select', // Cambiado a select
          readonly: false,
          colSpan: 6,
          options: Object.values(UnitOfMeasure).map(value => ({
            label: translateUnitOfMeasure(value),
            value: value
          })),
          formatFn: (value: string) => translateUnitOfMeasure(value)
        },
        {
          name: 'minimumStock',
          label: 'Stock Mínimo',
          type: 'number',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'maximumStock',
          label: 'Stock Máximo',
          type: 'number',
          readonly: false,
          colSpan: 6
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          readonly: false,
          colSpan: 12
        }
      ]
    }
  ]
};

/**
 * Configuración para el modo VISTA (solo lectura)
 */
export const VIEW_SUPPLY_FORM_CONFIG: GenericFormConfig = {
  title: 'Detalles del Insumo',
  readonly: true,
  showSubmitButton: false,
  showCancelButton: false,

  sections: [
    {
      title: '',
      icon: undefined,
      fields: [
        {
          name: 'name',
          label: 'Nombre del Insumo',
          type: 'text',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'category',
          label: 'Categoría',
          type: 'text', // Se mantiene como texto para vista, ya que solo muestra el valor
          readonly: true,
          colSpan: 6,
          formatFn: (value: string) => translateCategory(value)
        },
        {
          name: 'unitOfMeasure',
          label: 'Unidad de Medida',
          type: 'text', // Se mantiene como texto para vista
          readonly: true,
          colSpan: 6,
          formatFn: (value: string) => translateUnitOfMeasure(value)
        },
        {
          name: 'minimumStock',
          label: 'Stock Mínimo',
          type: 'number',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'maximumStock',
          label: 'Stock Máximo',
          type: 'number',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'description',
          label: 'Descripción',
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
export function getSupplyFormConfig(mode: 'create' | 'edit' | 'view'): GenericFormConfig {
  switch (mode) {
  case 'create':
    return CREATE_SUPPLY_FORM_CONFIG;
  case 'edit':
    return EDIT_SUPPLY_FORM_CONFIG;
  case 'view':
    return VIEW_SUPPLY_FORM_CONFIG;
  default:
    return VIEW_SUPPLY_FORM_CONFIG;
  }
}
