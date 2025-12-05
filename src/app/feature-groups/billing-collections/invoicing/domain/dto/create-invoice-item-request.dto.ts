/**
 * DTO representing an invoice item for backend creation.
 * Maps to backend CreateInvoiceItemRequest
 */
export interface CreateInvoiceItemRequestDto {
  /** Description of the item to be invoiced */
  description: string;

  /** Quantity of the item to be invoiced */
  quantity: number;

  /** Unit price of the item (without VAT) */
  unitPrice: number;

  /** VAT rate percentage applied to the item */
  vatRate: number;

  /** Discount percentage applied to the item (default: 0) */
  discountPercentage?: number;

  /** Account plan ID associated with the item */
  accountPlanId: string;

  /** Unit of measure shown on the invoice */
  unitOfMeasure?: string;
}