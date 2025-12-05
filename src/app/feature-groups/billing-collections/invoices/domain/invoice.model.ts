import { InvoiceKind } from './invoice-kind.enum';
import { InvoiceStatus } from './invoice-status.enum';
import { PaymentCondition } from './payment-condition.enum';
import { PaymentType } from './payment-type.enum';

/**
 * Invoice Model
 */
export interface Invoice {
  id?: number;

  kind: InvoiceKind;
  description: string;
  status?: InvoiceStatus;

  invoiceDate: string;
  paymentDate: string;
  createdAt?: string;
  updatedAt?: string;

  paymentCondition: PaymentCondition;
  paymentType: PaymentType;

  customerId: string;
  companyId: string;
  currencyId: string;
  branchId?: string;
  sessionId?: string;
  attentionId?: string;
  userId?: string;

  invoiceNumberPrefix: string;
  invoiceNumber: string;
  fullInvoiceNumber?: string;

  taxableSubtotal: number;
  nonTaxableSubtotal: number;
  totalVat: number;
  grandTotal: number;

  globalDiscountPercentage?: number;
  globalDiscountAmount?: number;

  items: InvoiceItem[];
  payments: InvoicePayment[];

  observations?: string;

  version?: number;

  cae?: string;
  caeExpirationDate?: string;
  afipAuthorizationDate?: string;
}

/**
 * Customer Model for Invoice
 */
export interface InvoiceCustomer {
  id: string;
  name: string;
  documentType: string;
  documentNumber: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCondition?: string;
}

/**
 * Company Model for Invoice
 */
export interface InvoiceCompany {
  id: string;
  name: string;
  cuit: string;
  address: string;
  phone?: string;
  email?: string;
  iibbNumber?: string;
  activityStartDate?: string;
}
