/**
 * Enum for Invoice Status (Estado de Factura)
 */
export enum InvoiceStatus {
  COBRADA = 'COBRADA',
  SIN_COBRAR = 'SIN_COBRAR',
  PARCIALMENTE_COBRADA = 'PARCIALMENTE_COBRADA',
  ANULADA = 'ANULADA',
  VENCIDA = 'VENCIDA'
}

/**
 * Labels for displaying invoice status in UI
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.COBRADA]: 'Cobrada',
  [InvoiceStatus.SIN_COBRAR]: 'Sin Cobrar',
  [InvoiceStatus.PARCIALMENTE_COBRADA]: 'Parcialmente Cobrada',
  [InvoiceStatus.ANULADA]: 'Anulada',
  [InvoiceStatus.VENCIDA]: 'Vencida'
};
