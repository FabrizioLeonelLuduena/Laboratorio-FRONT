/** Reference metadata attached to an invoiceable entry. */
export interface InvoiceReferenceDto {
  invoiceReferenceId: number;
  invoiceReference: string;
  invoiceableId: number;
}

/** Invoiceable entity representation returned by the backend. */
export interface InvoiceableDto {
  id: number;
  type: string;
  date: string;
  description: string;
  amount: number;
  invoiceReferenceDTO?: InvoiceReferenceDto;
}

