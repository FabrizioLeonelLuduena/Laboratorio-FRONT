/**
 * Invoice reference data from the external invoicing API.
 * Represents the invoice details stored after successful invoice generation.
 */
export interface InvoiceReference {
  /** Unique identifier of the invoice reference record */
  invoiceReferenceId: number;

  /** External invoice reference/number from the invoicing API */
  invoiceReference: string;

  /** ID of the invoiceable entity this reference belongs to */
  invoiceableId: number;

  /** Complete invoice data from external API (stored as JSON) */
  invoiceData?: unknown;
}