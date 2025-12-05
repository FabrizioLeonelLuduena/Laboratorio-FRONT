/**
 * View model for cash closing form
 */
export interface CashClosingFormValue {
  reportedCash: number;
  closingTime: Date;
  observations?: string;
  userId: string;
}

/**
 * View model for closing confirmation dialog
 */
export interface CashClosingConfirmationData {
  session: any;
  summary: any;
  reportedCashAmount: number;
  difference: number;
}

/**
 * View model for closing summary display
 */
export interface CashClosingSummary {
  initialCash: number;
  totalDeposits: number;
  totalWithdrawals: number;
  expectedCash: number;
}

/**
 * View model for closing operation result
 */
export interface CashClosingResult {
  success: boolean;
  sessionId: string;
  closingTime: Date;
  reportedCash: number;
  expectedCash: number;
  difference: number;
  message: string;
}
