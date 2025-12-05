import { BillingItem } from './billing-item.model';
import { InvoiceStatus } from './invoice-status.enum';
import { InvoiceType } from './invoice-type.enum';
import { PaymentMethodDetail } from './payment-method-detail.model';
import { VoucherType } from './voucher-type.enum';

/**
 * Billing (Factura) domain model
 * Represents a complete billing/invoice document with all its details
 */
export interface Billing {
  id?: number;

  // Invoice identification
  invoiceDate: string;
  voucherType: VoucherType;
  invoiceType: InvoiceType;
  invoiceNumberPrefix: string; // e.g., "0001"
  invoiceNumber: string; // e.g., "00000021"
  fullInvoiceNumber?: string; // e.g., "0001-00000021"
  status: InvoiceStatus;
  description: string;
  cae?: string; // CAE (Electronic Authorization Code issued by AFIP)

  // Remito (delivery note) generation
  generateRemito: boolean;
  remitoNumber?: string;

  // Invoice items (pre-loaded, read-only in Step 2)
  items: BillingItem[];

  // Totals and perceptions (Step 3)
  netTaxable: number; // Taxable net amount
  netNonTaxable: number; // Non-taxable net amount
  taxableSubtotal?: number; // Taxable subtotal (alternative naming)
  nonTaxableSubtotal?: number; // Non-taxable subtotal (alternative naming)
  totalVat: number; // VAT total
  vatPerception: number; // VAT perception (non-editable, calculated)
  iibbPerception: number; // IIBB perception amount
  iibbPerceptionType?: string; // IIBB perception type (from dropdown)
  totalInvoice: number; // Invoice total (calculated from items, non-editable)
  grandTotal?: number; // Total general (alternative to totalInvoice)
  attachedDocuments?: string[]; // URLs or file references

  // Payment methods (Step 4)
  paymentMethods: PaymentMethodDetail[];

  // Additional fields for billing-creator compatibility
  kind?: string; // Invoice kind (e.g., "FACTURA_A", "FACTURA_B")
  paymentDate?: string; // Payment date
  paymentCondition?: string; // Payment condition (e.g., "Contado", "Cuenta Corriente")
  paymentType?: string; // Payment type (e.g., "Efectivo", "Tarjeta")
  currencyId?: string; // Currency ID

  // Audit fields
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  // Additional metadata
  customerId?: string;
  companyId?: string;
  branchId?: string;
  observations?: string;
  invoiceId?: string; // External invoice ID (from Colppy or other systems)
  customerName?: string;
  customerIdentification?: string;
  customerAddress?: string;
  subtotalAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
}
