/**
 * Configuración del formulario colapsable para detalles de delivery notes
 * Permite agregar múltiples items dinámicamente usando CollapsableFormComponent
 */

import { CollapsableFormField } from 'src/app/shared/components/collapsable-form/collapsable-form.component';

/**
 * Campos para el formulario colapsable de detalles de delivery notes
 * Siguiendo el patrón usado en supplier-contact-form.config.ts
 */
export const DELIVERY_NOTE_DETAIL_FIELDS: CollapsableFormField[] = [
  {
    name: 'supplierItemId',
    label: 'Item del Proveedor',
    type: 'select',
    placeholder: 'Seleccione un item del proveedor',
    required: true,
    showInSummary: true,
    options: [] // Se llenarán dinámicamente
  },
  {
    name: 'requestedQuantity',
    label: 'Cantidad Solicitada',
    type: 'number',
    placeholder: '0',
    required: false,
    showInSummary: true
  },
  {
    name: 'receivedQuantity',
    label: 'Cantidad Recibida',
    type: 'number',
    placeholder: '0',
    required: true,
    showInSummary: true
  },
  {
    name: 'batchNumber',
    label: 'Número de Lote',
    type: 'text',
    placeholder: 'Ingrese número de lote',
    required: false,
    showInSummary: false
  },
  {
    // El componente genérico no soporta 'date' en el colapsable — usar text para que el usuario pueda introducir yyyy-MM-dd
    name: 'expirationDate',
    label: 'Vencimiento (yyyy-MM-dd)',
    type: 'text',
    placeholder: '2025-11-11',
    required: false,
    showInSummary: false
  },
  {
    // El componente colapsable no tiene tipo 'textarea' — usar 'text' para notas de lote
    name: 'batchNotes',
    label: 'Observaciones de Lote',
    type: 'text',
    placeholder: 'Notas sobre el lote...',
    required: false,
    showInSummary: false
  },
  {
    name: 'notes',
    label: 'Observaciones del Item',
    type: 'text',
    placeholder: 'Observaciones adicionales sobre este item...',
    required: false,
    showInSummary: false
  }
];
