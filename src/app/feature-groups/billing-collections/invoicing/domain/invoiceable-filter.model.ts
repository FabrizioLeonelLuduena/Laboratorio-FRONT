import { InvoiceableType } from './invoiceable-type.enum';

/**
 * Filter parameters for invoiceable entities query.
 * Matches backend InvoiceableFilterDTO.
 */
export interface InvoiceableFilter {
  /** Filter by invoiceable type */
  type?: InvoiceableType;

  /** Filter by date from (inclusive) */
  dateFrom?: Date;

  /** Filter by date to (inclusive) */
  dateTo?: Date;

  /** Filter by description (partial match) */
  description?: string;

  /** Filter by exact amount */
  amount?: number;

  /** Filter by invoice reference existence */
  hasInvoiceReference?: boolean;
}