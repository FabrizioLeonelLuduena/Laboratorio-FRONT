/**
 * Configuración del formulario de contactos para Suppliers
 * Usa CollapsableFormComponent para una experiencia similar a Employees
 */

import { CollapsableFormField } from 'src/app/shared/components/collapsable-form/collapsable-form.component';

/**
 * Campos para el formulario colapsable de contactos de suppliers
 * Similar al patrón usado en care-management/employee-home
 */

/**
 * Función helper para obtener los campos del formulario de contacto
 * Permite tener un placeholder y label dinámico según el tipo seleccionado
 */
export const getSupplierContactFields = (contactType?: 'EMAIL' | 'PHONE'): CollapsableFormField[] => [
  {
    name: 'contactType',
    label: 'Tipo',
    type: 'select',
    placeholder: 'Seleccione el tipo de contacto',
    required: true,
    showInSummary: true,
    options: [
      { label: 'Email', value: 'EMAIL' },
      { label: 'Teléfono', value: 'PHONE' }
    ]
  },
  {
    name: 'description',
    label: 'Nombre del contacto',
    type: 'text',
    placeholder: 'Ej: Personal, Trabajo, etc.',
    required: false,
    showInSummary: true
  },
  {
    name: 'contactValue',
    label: 'Dato de contacto',
    type: contactType === 'EMAIL' ? 'email' : contactType === 'PHONE' ? 'tel' : 'text',
    placeholder: contactType === 'EMAIL' ? 'ejemplo@correo.com' : contactType === 'PHONE' ? '+54 9 11 1234-5678' : 'Teléfono o email según el tipo seleccionado',
    required: true,
    showInSummary: false
  }
];

// Exportar configuración por defecto
export const SUPPLIER_CONTACT_FIELDS: CollapsableFormField[] = getSupplierContactFields();
