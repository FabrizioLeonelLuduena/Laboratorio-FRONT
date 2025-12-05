import { FundDestination } from '../fund-destination.enum';
import { PaymentMethod } from '../payment-method.enum';

/** Request payload for creating a billing document. */
export interface BillingCreateRequestDto {
  invoiceDate: string;
  voucherType: string;
  invoiceType: string;
  invoiceNumberPrefix: string;
  invoiceNumber: string;
  fullInvoiceNumber: string;
  status: string;
  description: string;
  generateRemito: boolean;
  remitoNumber?: string;
  netTaxable: number;
  netNonTaxable: number;
  totalVat: number;
  vatPerception: number;
  iibbPerception: number;
  iibbPerceptionType?: string;
  totalInvoice: number;
  attachedDocuments?: string[];
  customerId?: string;
  companyId?: string;
  branchId?: string;
  observations?: string;
  items: BillingItemCreateRequestDto[];
  paymentMethods: PaymentMethodCreateRequestDto[];
}

/** Request payload for items included in the billing. */
export interface BillingItemCreateRequestDto {
  code: string;
  description: string;
  warehouse: string;
  import: number;
  local: number;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  vatRate: number;
  accountPlanId: string;
  enabled: boolean;
}

/** Request payload for payment methods associated with the billing. */
export interface PaymentMethodCreateRequestDto {
  paymentMethod: PaymentMethod;
  fundDestination: FundDestination;
  bank?: string;
  number?: string;
  paymentDate: string;
  amount: number;
  observations?: string;
  transactionReference?: string;
}

