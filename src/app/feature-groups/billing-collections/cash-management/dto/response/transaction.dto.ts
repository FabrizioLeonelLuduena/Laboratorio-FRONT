/**
 * DTO representing a transaction response from backend
 */
export interface TransactionDto {
  transactionId: number;
  cashSessionId: number;
  transactionType: 'INFLOW' | 'OUTFLOW';
  paymentMethod: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'QR';
  amount: number;
  previousAmount: number;
  reason: string | null;
  transactionDate: string;
  canceled: boolean;
  newAmount: number;
  isFromAttention: boolean;
}

/**
 * Withdrawal response DTO
 */
export interface WithdrawalResponseDto {
  id: number;
  message: string;
}
