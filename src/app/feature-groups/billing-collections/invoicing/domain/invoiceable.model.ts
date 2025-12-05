import { InvoiceReference } from './invoice-reference.model';
import { InvoiceableType } from './invoiceable-type.enum';

/**
 * Represents a billable entity that can have an invoice generated.
 * Can be either a TRANSACTION or a PAYMENT.
 * Flattened from InvoiceableDTO + InvoiceReferenceDTO from backend.
 */
export interface Invoiceable {
  /** Unique identifier of the invoiceable entity */
  id: number;

  /** Type of invoiceable entity (TRANSACTION or PAYMENT) */
  type: InvoiceableType;

  /** Date when the invoiceable entity was created */
  date: Date;

  /** Description of the transaction or payment */
  description: string;

  /** Amount in the invoiceable entity */
  amount: number;

  /** Invoice reference data (null if no invoice has been generated) */
  invoiceReference?: InvoiceReference;

  /** Computed property: whether this entity has an invoice reference */
  hasInvoice: boolean;
}
