export enum BillableEntityType {
  TRANSACTION = 'TRANSACTION',
  PAYMENT = 'PAYMENT'
}

export const BillableEntityTypeLabels: Record<BillableEntityType, string> = {
  [BillableEntityType.TRANSACTION]: 'Transaction',
  [BillableEntityType.PAYMENT]: 'Payment'
};

