/**
 * View model for cash withdrawal form
 */
export interface CashWithdrawalFormValue {
  amount: number;
  concept: string;
  observations?: string;
  withdrawalType: 'expense' | 'refund' | 'other';
  category?: string;
}

/**
 * View model for withdrawal operation configuration
 */
export interface WithdrawalOperationConfig {
  type: 'withdrawal';
  title: string;
  subtitle: string;
  amountLabel: string;
  conceptLabel: string;
  observationsLabel: string;
  submitButtonText: string;
  cancelButtonText: string;
  maxAmount?: number;
  minAmount?: number;
}

/**
 * View model for withdrawal categories
 */
export interface WithdrawalCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

/**
 * View model for withdrawal operation data
 */
export interface WithdrawalOperationData {
  amount: number;
  concept: string;
  observations?: string;
}

/**
 * View model for withdrawal validation
 */
export interface WithdrawalValidation {
  isValid: boolean;
  message?: string;
}

/**
 * View model for withdrawal confirmation
 */
export interface WithdrawalConfirmationData {
  amount: number;
  concept: string;
}
