import { BillableEntityType } from './billable-entity-type.enum';

/**
 * Flattened representation of InvoiceableDTO and InvoiceReferenceDTO
 * from the backend
 */
export interface BillableEntity {
  // From InvoiceableDTO
  id: number;
  type: BillableEntityType;
  date: Date;
  description: string;
  amount: number;

  // From InvoiceReferenceDTO (flattened)
  invoiceReferenceId?: number;
  invoiceReference?: string; // Invoice number

  // Helper property
  hasInvoice: boolean;
}

/**
 *
 */
export interface BillableEntityFilters {
  type?: BillableEntityType;
  invoiced?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

