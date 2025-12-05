import { FundDestination } from '../fund-destination.enum';
import { PaymentMethod } from '../payment-method.enum';

/** Response payload returned when fetching a billing document. */
export interface BillingResponseDto {
  id: number;
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
  paymentMethods?: PaymentMethodDto[];
  items?: BillingItemDto[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** Response structure for paginated billing queries. */
export interface BillingListResponseDto {
  data: BillingResponseDto[];
  total?: number;
}

/** Representation of an item line coming from the billing API. */
export interface BillingItemDto {
  id: number;
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
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  accountPlanId: string;
  enabled: boolean;
}

/** Representation of a payment method coming from the billing API. */
export interface PaymentMethodDto {
  id: number;
  paymentMethod: PaymentMethod;
  fundDestination: FundDestination;
  bank?: string;
  number?: string;
  paymentDate: string;
  amount: number;
  observations?: string;
  transactionReference?: string;
}

