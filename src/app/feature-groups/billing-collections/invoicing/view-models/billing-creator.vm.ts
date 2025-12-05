import { Billing } from '../domain/billing.model';

/**
 * Validation errors interface
 */
export interface ValidationErrors {
  [key: string]: string[];
}

/**
 * Billing Creator Step enum
 */
export enum BillingCreatorStep {
  INVOICE_DATA = 1,
  INVOICE_ITEMS = 2,
  TOTALS = 3,
  PAYMENT_METHODS = 4
}

/**
 * Billing Creator View Model
 * Manages the state of the billing creator component
 */
export interface BillingCreatorViewModel {
  billing: Billing;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationErrors;
  currentStep: BillingCreatorStep;
  isDirty: boolean;

  // Step validity flags
  invoiceDataValid: boolean;
  itemsValid: boolean;
  totalsValid: boolean;
  paymentMethodsValid: boolean;
}
