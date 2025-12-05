/**
 * View model for cash deposit form
 */
export interface CashDepositFormValue {
  amount: number;
  paymentMethod: string;
  concept: string;
  observations?: string;
  patientId?: string;
  patientName?: string;
}

/**
 * View model for deposit operation configuration
 */
export interface DepositOperationConfig {
  type: 'deposit';
  title: string;
  subtitle: string;
  amountLabel: string;
  paymentMethodLabel: string;
  conceptLabel: string;
  observationsLabel: string;
  submitButtonText: string;
  cancelButtonText: string;
}

/**
 * View model for deposit operation data
 */
export interface DepositOperationData {
  amount: number;
  paymentMethod: string;
  concept: string;
  observations?: string;
  patientInfo?: {
    id: string;
    name: string;
  };
}
