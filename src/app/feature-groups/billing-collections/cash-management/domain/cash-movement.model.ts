/**
 * Domain model for cash movements (deposits/withdrawals)
 */
export interface CashMovement {
  id: number;
  sessionId: number;
  type: MovementType;
  amount: number;
  previousAmount: number;
  paymentMethod: PaymentMethod;
  reason: string | null;
  transactionDate: Date;
  userId: number;
  patientId?: number;
  canceled: boolean;
  newAmount: number;
  isFromAttention: boolean;
}

/**
 * Movement type enum
 */
export enum MovementType {
  DEPOSIT = 'INFLOW',
  WITHDRAWAL = 'OUTFLOW'
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  CASH = 'CASH',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_CARD = 'CREDIT_CARD',
  TRANSFER = 'TRANSFER',
  QR = 'QR'
}
