/**
 * Invoice export configuration
 * Defines the column structure for invoice exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';
import { Invoiceable } from '../domain/invoiceable.model';

import * as InvoiceDataHelpers from './invoice-data-helpers.util';

/**
 * Column definitions for invoice Excel exports
 * Used by Excel export service
 */
export const INVOICE_EXPORT_COLUMNS: ExportColumn<Invoiceable>[] = [
  {
    header: 'Tipo',
    getValue: (invoice) => InvoiceDataHelpers.getTypeLabel(invoice.type),
    width: 20
  },
  {
    header: 'Fecha',
    getValue: (invoice) => InvoiceDataHelpers.formatDate(invoice.date),
    width: 15
  },
  {
    header: 'Descripción',
    getValue: (invoice) => InvoiceDataHelpers.getDescription(invoice.description),
    width: 50
  },
  {
    header: 'Importe',
    getValue: (invoice) => InvoiceDataHelpers.formatAmount(invoice.amount),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (invoice) => InvoiceDataHelpers.getInvoiceStatus(invoice),
    width: 18
  },
  {
    header: 'Número de Factura',
    getValue: (invoice) => InvoiceDataHelpers.getInvoiceNumber(invoice),
    width: 20
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const INVOICE_PDF_COLUMNS: ExportColumn<Invoiceable>[] = [
  {
    header: 'Tipo',
    getValue: (invoice) => InvoiceDataHelpers.getTypeLabel(invoice.type),
    width: 20
  },
  {
    header: 'Fecha',
    getValue: (invoice) => InvoiceDataHelpers.formatDate(invoice.date),
    width: 16
  },
  {
    header: 'Descripción',
    getValue: (invoice) => InvoiceDataHelpers.getDescription(invoice.description),
    width: 40
  },
  {
    header: 'Importe',
    getValue: (invoice) => InvoiceDataHelpers.formatAmount(invoice.amount),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (invoice) => InvoiceDataHelpers.getInvoiceStatus(invoice),
    width: 18
  },
  {
    header: 'N° Factura',
    getValue: (invoice) => InvoiceDataHelpers.getInvoiceNumber(invoice),
    width: 20
  }
];
