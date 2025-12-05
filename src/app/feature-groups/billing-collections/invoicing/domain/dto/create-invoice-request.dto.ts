import { InvoiceKind } from '../invoice-kind.enum';

import { CreateInvoiceItemRequestDto } from './create-invoice-item-request.dto';
import { CreateInvoicePaymentRequestDto } from './create-invoice-payment-request.dto';

/**
 * DTO representing an invoice for backend creation.
 * Maps to backend CreateInvoiceRequest
 */
export interface CreateInvoiceRequestDto {
  /** Type of invoice to be issued (e.g., FACTURA_B) */
  kind: InvoiceKind;

  /** General description of the invoice */
  description: string;

  /** Invoice date in ISO format */
  invoiceDate: string;

  /** Estimated payment date in ISO format */
  paymentDate: string;

  /** Payment condition agreed with the client */
  paymentCondition: string;

  /** Payment type requested by Colppy */
  paymentType: string;

  /** Colppy client identifier */
  customerId: string;

  /** Colppy company identifier */
  companyId: string;

  /** Colppy currency identifier */
  currencyId: string;

  /** Invoice number prefix (e.g., "0001") */
  invoiceNumberPrefix: string;

  /** Invoice number within the branch */
  invoiceNumber: string;

  /** Taxable subtotal (without taxes) */
  taxableSubtotal: number;

  /** Non-taxable subtotal */
  nonTaxableSubtotal: number;

  /** Total VAT calculated */
  totalVat: number;

  /** Grand total of the invoice */
  grandTotal: number;

  /** List of items to be invoiced */
  items: CreateInvoiceItemRequestDto[];

  /** List of payments associated with the invoice */
  payments?: CreateInvoicePaymentRequestDto[];
}
