/**
 * Configuración de ejemplo del formulario genérico para Suppliers
 * Este archivo demuestra cómo usar el GenericProcurementFormComponent
 */

import { phoneValidator } from '../../validators/suppliers.validators';
import { GenericFormConfig, ProcurementValidationConstants } from '../form-config.model';

/**
 * Configuración para el formulario de CREAR supplier
 */
export const CREATE_SUPPLIER_FORM_CONFIG: GenericFormConfig = {
  title: 'Crear Proveedor',
  isEditMode: false,
  showSubmitButton: true,
  showCancelButton: true,
  submitButtonLabel: 'Crear Proveedor',
  cancelButtonLabel: 'Cancelar',
  submitButtonIcon: 'pi pi-check',
  cancelButtonIcon: 'pi pi-times',
  submitButtonSeverity: 'success',
  showValidationAlerts: true,

  sections: [
    {
      title: 'Información del Proveedor',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'companyName',
          label: 'Razón Social',
          type: 'text',
          placeholder: 'Ingrese la razón social',
          required: true,
          maxLength: ProcurementValidationConstants.MAX_COMPANY_NAME_LENGTH,
          pattern: ProcurementValidationConstants.COMPANY_NAME_PATTERN,
          patternMessage: 'La razón social contiene caracteres inválidos',
          helpText: 'Nombre legal completo de la empresa',
          colSpan: 6
        },
        {
          name: 'cuit',
          label: 'CUIT',
          type: 'text',
          placeholder: '20-12345678-9',
          required: true,
          minLength: ProcurementValidationConstants.CUIT_LENGTH,
          maxLength: ProcurementValidationConstants.CUIT_LENGTH,
          pattern: ProcurementValidationConstants.CUIT_PATTERN,
          patternMessage: ProcurementValidationConstants.CUIT_MESSAGE,
          helpText: 'CUIT de 11 dígitos sin guiones',
          colSpan: 6
        }
      ]
    },
    {
      title: 'Contactos',
      icon: 'pi pi-users',
      fields: [
        {
          name: 'contacts',
          label: 'Contactos',
          type: 'array',
          addButtonLabel: 'Agregar Contacto',
          helpText: 'Agregue al menos un contacto para el proveedor',
          colSpan: 12,
          arrayFields: [
            {
              name: 'name',
              label: 'Nombre',
              type: 'text',
              placeholder: 'Nombre completo',
              required: true,
              maxLength: ProcurementValidationConstants.MAX_NAME_LENGTH,
              colSpan: 6
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'correo@ejemplo.com',
              required: true,
              maxLength: ProcurementValidationConstants.MAX_EMAIL_LENGTH,
              colSpan: 6
            },
            {
              name: 'phone',
              label: 'Teléfono',
              type: 'phone',
              placeholder: '+54 11 1234-5678',
              maxLength: ProcurementValidationConstants.MAX_PHONE_LENGTH,
              customValidator: phoneValidator,
              colSpan: 6
            },
            {
              name: 'address',
              label: 'Dirección',
              type: 'text',
              placeholder: 'Dirección completa',
              maxLength: ProcurementValidationConstants.MAX_ADDRESS_LENGTH,
              colSpan: 6
            },
            {
              name: 'isActive',
              label: 'Activo',
              type: 'checkbox',
              defaultValue: true,
              colSpan: 0
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Configuración para el formulario de EDITAR supplier
 */
export const EDIT_SUPPLIER_FORM_CONFIG: GenericFormConfig = {
  title: 'Editar Proveedor',
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
      title: 'Información del Proveedor',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'cuit',
          label: 'CUIT',
          type: 'text',
          icon: 'pi pi-id-card',
          readonly: true,
          helpText: 'El CUIT no puede modificarse una vez creado',
          colSpan: 6
        },
        {
          name: 'companyName',
          label: 'Razón Social',
          type: 'text',
          placeholder: 'Ingrese la razón social',
          icon: 'pi pi-building',
          required: true,
          maxLength: ProcurementValidationConstants.MAX_COMPANY_NAME_LENGTH,
          pattern: ProcurementValidationConstants.COMPANY_NAME_PATTERN,
          patternMessage: 'La razón social contiene caracteres inválidos',
          colSpan: 6
        },
        {
          name: 'isActive',
          label: 'Proveedor Activo',
          type: 'checkbox',
          helpText: 'Desactive para inhabilitar el proveedor sin eliminarlo',
          colSpan: 0, // Oculto - se maneja desde la funcionalidad de activar/desactivar
          editOnly: true
        }
      ]
    },
    {
      title: 'Contactos',
      icon: 'pi pi-users',
      description: 'Actualice o agregue contactos del proveedor',
      fields: [
        {
          name: 'contacts',
          label: 'Contactos',
          type: 'array',
          addButtonLabel: 'Agregar Nuevo Contacto',
          colSpan: 12,
          arrayFields: [
            {
              name: 'id',
              label: 'ID',
              type: 'number',
              defaultValue: null,
              colSpan: 0 // Oculto, solo para tracking
            },
            {
              name: 'name',
              label: 'Nombre',
              type: 'text',
              placeholder: 'Nombre completo',
              required: true,
              maxLength: ProcurementValidationConstants.MAX_NAME_LENGTH,
              colSpan: 6
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'correo@ejemplo.com',
              required: true,
              maxLength: ProcurementValidationConstants.MAX_EMAIL_LENGTH,
              colSpan: 6
            },
            {
              name: 'phone',
              label: 'Teléfono',
              type: 'phone',
              placeholder: '+54 11 1234-5678',
              maxLength: ProcurementValidationConstants.MAX_PHONE_LENGTH,
              customValidator: phoneValidator,
              colSpan: 6
            },
            {
              name: 'address',
              label: 'Dirección',
              type: 'text',
              placeholder: 'Dirección completa',
              maxLength: ProcurementValidationConstants.MAX_ADDRESS_LENGTH,
              colSpan: 12
            },
            {
              name: 'isActive',
              label: 'Activo',
              type: 'checkbox',
              defaultValue: true,
              colSpan: 0 // Oculto - se maneja eliminando el contacto directamente
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Configuración para el modo VISTA (solo lectura)
 */
export const VIEW_SUPPLIER_FORM_CONFIG: GenericFormConfig = {
  title: 'Detalles del Proveedor',
  readonly: true,
  showSubmitButton: false,
  showCancelButton: false,

  sections: [
    {
      title: 'Información del Proveedor',
      icon: 'pi pi-info-circle',
      fields: [
        {
          name: 'cuit',
          label: 'CUIT',
          type: 'text',
          icon: 'pi pi-id-card',
          readonly: true,
          colSpan: 6
        },
        {
          name: 'companyName',
          label: 'Razón Social',
          type: 'text',
          icon: 'pi pi-building',
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
    },
    {
      title: 'Contactos',
      icon: 'pi pi-users',
      fields: [
        {
          name: 'contacts',
          label: 'Contactos',
          type: 'array',
          readonly: true,
          colSpan: 12,
          arrayFields: [
            {
              name: 'name',
              label: 'Nombre',
              type: 'text',
              readonly: true,
              colSpan: 6
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              readonly: true,
              colSpan: 6
            },
            {
              name: 'phone',
              label: 'Teléfono',
              type: 'text',
              readonly: true,
              colSpan: 6
            },
            {
              name: 'address',
              label: 'Dirección',
              type: 'text',
              readonly: true,
              colSpan: 12
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Función helper para obtener la configuración según el modo
 */
export function getSupplierFormConfig(mode: 'create' | 'edit' | 'view'): GenericFormConfig {
  switch (mode) {
  case 'create':
    return CREATE_SUPPLIER_FORM_CONFIG;
  case 'edit':
    return EDIT_SUPPLIER_FORM_CONFIG;
  case 'view':
    return VIEW_SUPPLIER_FORM_CONFIG;
  default:
    return VIEW_SUPPLIER_FORM_CONFIG;
  }
}
