export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE'
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'Borrador',
  [InvoiceStatus.CONFIRMED]: 'Confirmada',
  [InvoiceStatus.CANCELLED]: 'Cancelada',
  [InvoiceStatus.PAID]: 'Pagada',
  [InvoiceStatus.PARTIALLY_PAID]: 'Parcialmente Pagada',
  [InvoiceStatus.OVERDUE]: 'Vencida'
};
