/**
 * Enum for Voucher Types (Tipo de Comprobante)
 */
export enum VoucherType {
  FACTURA = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
  RECIBO = 'RECIBO',
  REMITO = 'REMITO',
  PRESUPUESTO = 'PRESUPUESTO'
}

/**
 * Labels for displaying voucher types in UI
 */
export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  [VoucherType.FACTURA]: 'Invoice',
  [VoucherType.NOTA_CREDITO]: 'Credit note',
  [VoucherType.NOTA_DEBITO]: 'Debit note',
  [VoucherType.RECIBO]: 'Receipt',
  [VoucherType.REMITO]: 'Delivery note',
  [VoucherType.PRESUPUESTO]: 'Quotation'
};
