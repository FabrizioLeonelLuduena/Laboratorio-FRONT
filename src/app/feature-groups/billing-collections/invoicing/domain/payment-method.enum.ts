/**
 * Enum for payment methods.
 */
export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  MERCADO_PAGO = 'MERCADO_PAGO',
  QR = 'QR',
  OTRO = 'OTRO'
}

/**
 * Labels for displaying payment methods in the UI.
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.TRANSFERENCIA]: 'Transferencia',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.TARJETA_DEBITO]: 'Tarjeta de débito',
  [PaymentMethod.TARJETA_CREDITO]: 'Tarjeta de crédito',
  [PaymentMethod.MERCADO_PAGO]: 'Mercado Pago',
  [PaymentMethod.QR]: 'QR',
  [PaymentMethod.OTRO]: 'Otro'
};
