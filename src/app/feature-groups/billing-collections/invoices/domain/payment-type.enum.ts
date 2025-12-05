export enum PaymentType {
  EFECTIVO = 'Efectivo',
  TRANSFERENCIA = 'Transferencia',
  CHEQUE = 'Cheque',
  TARJETA_DEBITO = 'Tarjeta de Débito',
  TARJETA_CREDITO = 'Tarjeta de Crédito',
  MERCADO_PAGO = 'Mercado Pago',
  QR = 'QR'
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.EFECTIVO]: 'Efectivo',
  [PaymentType.TRANSFERENCIA]: 'Transferencia',
  [PaymentType.CHEQUE]: 'Cheque',
  [PaymentType.TARJETA_DEBITO]: 'Tarjeta de Débito',
  [PaymentType.TARJETA_CREDITO]: 'Tarjeta de Crédito',
  [PaymentType.MERCADO_PAGO]: 'Mercado Pago',
  [PaymentType.QR]: 'QR'
};
