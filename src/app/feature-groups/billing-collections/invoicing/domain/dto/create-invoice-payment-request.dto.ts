/**
 * DTO representing an invoice payment for backend creation.
 * Maps to backend CreateInvoicePaymentRequest
 */
export interface CreateInvoicePaymentRequestDto {
  /** Colppy payment method identifier */
  paymentMethodId: string;

  /** Account plan where the payment is registered */
  accountPlanId: string;

  /** Associated bank for the payment, if applicable */
  bank?: string;

  /** Check number, if applicable */
  checkNumber?: string;

  /** Validity date of the payment instrument (ISO format) */
  validityDate?: string;

  /** Amount paid for this item */
  amount: number;
}