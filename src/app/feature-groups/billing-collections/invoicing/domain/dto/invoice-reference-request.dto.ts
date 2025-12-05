import { CreateInvoiceRequestDto } from './create-invoice-request.dto';

/**
 * DTO for requesting an invoice reference along with invoice data.
 * Maps to backend InvoiceReferenceRequestDTO
 */
export interface InvoiceReferenceRequestDto {
  /** Identifier of the entity that can be invoiced */
  invoiceableId: number;

  /** Flag indicating if attention is required for this invoice reference */
  isAttention?: boolean;

  /** Data related to the invoice to be created with this reference */
  invoiceData: CreateInvoiceRequestDto;
}
