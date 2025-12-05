/**
 * Goods Receipts export configuration
 * Defines the column structure for delivery note (remito) exports
 * using the generic Excel/PDF services.
 */

import { ExportColumn } from '../../../../../shared/services/export';
import { ResponseDeliveryNoteDTO } from '../../../models/goods-receipts/goods-receipts.models';

/**
 * Delivery note display row type for exports.
 * Extiende el DTO del backend con los campos enriquecidos que
 * arma el componente de listado (supplierName, receivedDate, statusText).
 */
export type DeliveryNoteDisplayRow = ResponseDeliveryNoteDTO & {
  supplierName?: string;
  receivedDate?: string;
  statusText?: string;
};

/**
 * Column definitions for delivery note Excel exports
 */
export const GOODS_RECEIPT_EXPORT_COLUMNS: ExportColumn<DeliveryNoteDisplayRow>[] = [
  {
    header: 'Nº Remito',
    getValue: (note) => note.id?.toString() || '-',
    width: 12
  },
  {
    header: 'Proveedor',
    getValue: (note) => note.supplierName || note.supplier?.companyName || '-',
    width: 40
  },
  {
    header: 'Fecha Recepción',
    getValue: (note) => note.receivedDate || note.receiptDate || '-',
    width: 20
  },
  {
    header: 'Estado',
    getValue: (note) => note.statusText || String(note.status) || '-',
    width: 18
  },
  {
    header: 'Nº Orden Compra',
    getValue: (note) =>
      note.purchaseOrderNumber?.toString() ||
      note.purchaseOrderId?.toString() ||
      '-',
    width: 18
  },
  {
    header: 'Notas',
    getValue: (note) => note.notes || '-',
    width: 50
  }
];

/**
 * Column definitions for delivery note PDF exports (abbreviated headers)
 */
export const GOODS_RECEIPT_PDF_COLUMNS: ExportColumn<DeliveryNoteDisplayRow>[] = [
  {
    header: 'Nº Remito',
    getValue: (note) => note.id?.toString() || '-',
    width: 18
  },
  {
    header: 'Proveedor',
    getValue: (note) => note.supplierName || note.supplier?.companyName || '-',
    width: 60
  },
  {
    header: 'Fecha',
    getValue: (note) => note.receivedDate || note.receiptDate || '-',
    width: 24
  },
  {
    header: 'Estado',
    getValue: (note) => note.statusText || String(note.status) || '-',
    width: 20
  }
];

