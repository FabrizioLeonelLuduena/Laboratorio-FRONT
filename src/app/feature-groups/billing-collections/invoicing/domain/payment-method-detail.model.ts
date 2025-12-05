import { FundDestination } from './fund-destination.enum';
import { PaymentMethod } from './payment-method.enum';

/**
 * Payment Method Detail model
 * Represents payment information for an invoice
 */
export interface PaymentMethodDetail {
  id?: number;

  // Payment identification
  paymentMethod: PaymentMethod;
  fundDestination: FundDestination;
  bank?: string;
  number?: string;
  paymentDate: string;
  amount: number;

  // Additional details
  observations?: string;
  transactionReference?: string;
  accountPlanId?: string; // Chart of accounts ID (required by backend)
}

/**
 * Bank options (example data - prepare for API connection)
 */
export const BANK_OPTIONS = [
  'Banco Nación',
  'Banco Provincia',
  'Banco Galicia',
  'Banco Santander Río',
  'Banco BBVA',
  'Banco Macro',
  'Banco Supervielle',
  'Banco ICBC',
  'Banco Patagonia',
  'Banco Ciudad',
  'Otro'
];
