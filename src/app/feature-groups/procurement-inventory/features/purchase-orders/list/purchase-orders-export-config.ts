/**
 * Purchase Orders export configuration
 * Defines the column structure for purchase order exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

/**
 * Purchase Order display row type
 */
export type PurchaseOrderDisplayRow = {
  id: number;
  purchaseOrderNumber?: string;
  supplierName?: string;
  orderDate?: string;
  deliveryDate?: string;
  status?: string;
  totalAmount?: number;
  observations?: string;
  [key: string]: any;
};

/**
 * Format currency to Argentine Peso
 */
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
}

/**
 * Format date to dd/MM/yyyy
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Column definitions for purchase order Excel exports
 */
export const PURCHASE_ORDER_EXPORT_COLUMNS: ExportColumn<PurchaseOrderDisplayRow>[] = [
  {
    header: 'Número de Orden',
    getValue: (order) => order.purchaseOrderNumber || '-',
    width: 20
  },
  {
    header: 'Proveedor',
    getValue: (order) => order.supplierName || '-',
    width: 35
  },
  {
    header: 'Fecha de Pedido',
    getValue: (order) => formatDate(order.orderDate),
    width: 18
  },
  {
    header: 'Fecha de Entrega',
    getValue: (order) => formatDate(order.deliveryDate),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (order) => order.status || '-',
    width: 18
  },
  {
    header: 'Monto Total',
    getValue: (order) => formatCurrency(order.totalAmount),
    width: 20
  },
  {
    header: 'Observaciones',
    getValue: (order) => order.observations || '-',
    width: 50
  }
];

/**
 * Column definitions for purchase order PDF exports (abbreviated headers)
 */
export const PURCHASE_ORDER_PDF_COLUMNS: ExportColumn<PurchaseOrderDisplayRow>[] = [
  {
    header: 'Nº Orden',
    getValue: (order) => order.purchaseOrderNumber || '-',
    width: 20
  },
  {
    header: 'Proveedor',
    getValue: (order) => order.supplierName || '-',
    width: 40
  },
  {
    header: 'Fecha Pedido',
    getValue: (order) => formatDate(order.orderDate),
    width: 22
  },
  {
    header: 'Fecha Entrega',
    getValue: (order) => formatDate(order.deliveryDate),
    width: 22
  },
  {
    header: 'Estado',
    getValue: (order) => order.status || '-',
    width: 20
  },
  {
    header: 'Monto Total',
    getValue: (order) => formatCurrency(order.totalAmount),
    width: 25
  }
];
