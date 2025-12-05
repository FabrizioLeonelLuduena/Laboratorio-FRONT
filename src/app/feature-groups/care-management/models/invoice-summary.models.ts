/**
 * Invoice Summary Models
 * Used by invoice-summary component to display invoice information
 */

/**
 * Represents a single invoice item line
 */
export interface InvoiceItem {
  description: string;
  totalAmount: number;
  coveredAmount: number;
  patientAmount: number;
  selected: boolean;
}

/**
 * Represents a payment method used in the invoice
 */
export interface InvoicePaymentMethod {
  id?: number;
  paymentMethod: string;
  amount: number;
  bank?: string;
  number?: string;
}

/**
 * Invoice totals breakdown
 */
export interface InvoiceTotals {
  subtotal: number;
  iva: number;
  total: number;
}

/**
 * Complete invoice summary data structure used in FE component
 */
export interface InvoiceSummaryData {
  billingId?: number;
  date: string;
  status: string;
  items: InvoiceItem[];
  paymentMethods: InvoicePaymentMethod[];
  totals: InvoiceTotals;
  ivaPercentage?: number;
  invoiceNumber?: string;
  cae?: string;
}
