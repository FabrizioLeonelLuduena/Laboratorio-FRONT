export enum PaymentCondition {
  CONTADO = 'Contado',
  CREDITO = 'Crédito',
  CUENTA_CORRIENTE = 'Cuenta Corriente'
}

export const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  [PaymentCondition.CONTADO]: 'Contado',
  [PaymentCondition.CREDITO]: 'Crédito',
  [PaymentCondition.CUENTA_CORRIENTE]: 'Cuenta Corriente'
};
