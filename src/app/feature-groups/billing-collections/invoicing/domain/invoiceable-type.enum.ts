/**
 * Enum representing the type of invoiceable entity.
 * Matches backend InvoiceableType enum.
 */
export enum InvoiceableType {
  TRANSACTION = 'TRANSACTION',
  PAYMENT = 'PAYMENT'
}

/**
 * Display labels for InvoiceableType values.
 */
export const InvoiceableTypeLabels: Record<InvoiceableType, string> = {
  [InvoiceableType.TRANSACTION]: 'Transacción',
  [InvoiceableType.PAYMENT]: 'Pago'
};