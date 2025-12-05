/**
 * Configuración de formularios para Suppliers usando GenericFormComponent del shared global
 * Este archivo adapta la configuración para usar los componentes genéricos globales
 */

import { GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

/**
 * Constantes de validación para Suppliers
 */
const VALIDATION = {
  MAX_COMPANY_NAME_LENGTH: 300,
  CUIT_LENGTH: 11,
  MAX_NAME_LENGTH: 150,
  MAX_EMAIL_LENGTH: 150,
  MAX_PHONE_LENGTH: 15,
  MAX_ADDRESS_LENGTH: 150,
  COMPANY_NAME_PATTERN: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,&-]+$/
} as const;

/**
 * Campos para el formulario de CREAR supplier
 */
export const CREATE_SUPPLIER_FIELDS: GenericFormField[] = [
  // Razón Social
  {
    name: 'companyName',
    label: 'Razón Social',
    type: 'text',
    placeholder: 'Ingrese la razón social',
    required: true,
    maxLength: VALIDATION.MAX_COMPANY_NAME_LENGTH,
    pattern: VALIDATION.COMPANY_NAME_PATTERN,
    hint: 'Nombre legal completo de la empresa',
    colSpan: 2,
    messages: {
      required: 'La razón social es obligatoria',
      pattern: 'La razón social contiene caracteres inválidos',
      maxLength: `La razón social no puede superar los ${VALIDATION.MAX_COMPANY_NAME_LENGTH} caracteres`
    }
  },

  // CUIT
  {
    name: 'cuit',
    label: 'CUIT',
    type: 'text',
    placeholder: '20123456789',
    required: true,
    minLength: VALIDATION.CUIT_LENGTH,
    maxLength: VALIDATION.CUIT_LENGTH,
    hint: 'CUIT de 11 dígitos sin guiones',
    colSpan: 2,
    messages: {
      required: 'El CUIT es obligatorio',
      minLength: 'El CUIT debe tener 11 dígitos',
      maxLength: 'El CUIT debe tener 11 dígitos'
    }
  },

  // Divider: Contactos
  {
    name: 'contactsDivider',
    label: '',
    type: 'divider',
    align: 'left'
  },

  // Array de Contactos
  {
    name: 'contacts',
    label: '',
    type: 'array',
    required: true,
    colSpan: 4,
    hint: 'Agregue al menos un contacto para el proveedor',
    array: {
      itemsTitle: 'Contacto',
      defaultCollapsed: false,
      minItems: 1,
      maxItems: 10,
      addLabel: 'Agregar Contacto',
      itemFields: [
        {
          name: 'name',
          label: 'Nombre Completo',
          type: 'text',
          placeholder: 'Nombre completo del contacto',
          required: true,
          showInSummary: true
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
          required: true,
          showInSummary: true
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'tel',
          placeholder: '+54 11 1234-5678',
          showInSummary: false
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text',
          placeholder: 'Dirección completa',
          showInSummary: false
        }
      ]
    },
    messages: {
      minItems: 'Debe agregar al menos un contacto',
      maxItems: 'No puede agregar más de 10 contactos'
    }
  }
];

/**
 * Campos para el formulario de EDITAR supplier
 */
export const EDIT_SUPPLIER_FIELDS: GenericFormField[] = [
  // CUIT (solo lectura)
  {
    name: 'cuit',
    label: 'CUIT',
    type: 'text',
    disabled: true,
    hint: 'El CUIT no puede modificarse una vez creado',
    colSpan: 2
  },

  // Razón Social
  {
    name: 'companyName',
    label: 'Razón Social',
    type: 'text',
    placeholder: 'Ingrese la razón social',
    required: true,
    maxLength: VALIDATION.MAX_COMPANY_NAME_LENGTH,
    pattern: VALIDATION.COMPANY_NAME_PATTERN,
    colSpan: 2,
    messages: {
      required: 'La razón social es obligatoria',
      pattern: 'La razón social contiene caracteres inválidos',
      maxLength: `La razón social no puede superar los ${VALIDATION.MAX_COMPANY_NAME_LENGTH} caracteres`
    }
  },

  // Divider: Contactos
  {
    name: 'contactsDivider',
    label: 'Contactos',
    type: 'divider',
    align: 'left'
  },

  // Array de Contactos
  {
    name: 'contacts',
    label: '',
    type: 'array',
    required: true,
    colSpan: 4,
    hint: 'Actualice o agregue contactos del proveedor',
    array: {
      itemsTitle: 'Contacto',
      defaultCollapsed: false,
      minItems: 1,
      maxItems: 10,
      addLabel: 'Agregar Nuevo Contacto',
      itemFields: [
        // ID (oculto, no se muestra en el formulario pero se mantiene en el modelo)
        {
          name: 'id',
          label: 'ID',
          type: 'number',
          showInSummary: false
        },
        {
          name: 'name',
          label: 'Nombre Completo',
          type: 'text',
          placeholder: 'Nombre completo del contacto',
          required: true,
          showInSummary: true
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
          required: true,
          showInSummary: true
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'tel',
          placeholder: '+54 11 1234-5678',
          showInSummary: false
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text',
          placeholder: 'Dirección completa',
          showInSummary: false
        }
      ]
    },
    messages: {
      minItems: 'Debe tener al menos un contacto',
      maxItems: 'No puede tener más de 10 contactos'
    }
  }
];

/**
 * Campos para el formulario de VER supplier (solo lectura)
 */
export const VIEW_SUPPLIER_FIELDS: GenericFormField[] = [
  // CUIT
  {
    name: 'cuit',
    label: 'CUIT',
    type: 'text',
    disabled: true,
    colSpan: 2
  },

  // Razón Social
  {
    name: 'companyName',
    label: 'Razón Social',
    type: 'text',
    disabled: true,
    colSpan: 2
  },

  // Motivo de desactivación (si aplica)
  // Backend devuelve este campo como "reason"
  {
    name: 'reason',
    label: 'Motivo de Desactivación',
    type: 'textarea',
    disabled: true,
    rows: 3,
    colSpan: 4
  }
];

/**
 * Función helper para obtener los campos según el modo
 */
export function getSupplierFormFields(mode: 'create' | 'edit' | 'view'): GenericFormField[] {
  switch (mode) {
  case 'create':
    return CREATE_SUPPLIER_FIELDS;
  case 'edit':
    return EDIT_SUPPLIER_FIELDS;
  case 'view':
    return VIEW_SUPPLIER_FIELDS;
  default:
    return VIEW_SUPPLIER_FIELDS;
  }
}
