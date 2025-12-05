/**
 * Billing Item model
 * Represents a line item in an invoice
 */
export interface BillingItem {
  id?: number;

  // Item identification and description
  code: string; // Item code
  description: string; // Item description

  // Location and origin
  warehouse: string; // Warehouse or location
  import: number; // Imported quantity
  local: number; // Local quantity

  // Measurement
  unitOfMeasure: string; // Unit of measure
  quantity: number; // Quantity

  // Pricing
  unitPrice: number; // Unit price
  discountPercentage: number; // Discount percentage
  vatRate: number; // VAT rate

  // Calculated fields
  subtotal?: number; // Subtotal
  discountAmount?: number; // Discount amount (calculated)
  taxableAmount?: number; // Taxable base (calculated)
  vatAmount?: number; // VAT amount (calculated)
  totalAmount?: number; // Total amount (calculated)

  // Accounting
  accountPlanId: string; // Chart of accounts ID

  // Status
  enabled: boolean; // For enable/disable action
}

/**
 * Common unit of measure options
 */
export const UNIT_OF_MEASURE_OPTIONS = [
  'unit',
  'meter',
  'kilogram',
  'liter',
  'box',
  'package',
  'dozen',
  'service',
  'hour',
  'day'
];

/**
 * Common VAT rates in Argentina
 */
export const VAT_RATES = [0, 10.5, 21, 27];
