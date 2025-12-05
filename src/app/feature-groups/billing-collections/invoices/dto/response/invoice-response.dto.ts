/**
 * Invoice Response DTO
 */
export interface InvoiceResponseDto {
  id: number;
  kind: string;
  description: string;
  status: string;
  invoice_date: string;
  payment_date: string;
  payment_condition: string;
  payment_type: string;
  customer_id: string;
  company_id: string;
  currency_id: string;
  branch_id?: string;
  session_id?: string;
  attention_id?: string;
  user_id?: string;
  invoice_number_prefix: string;
  invoice_number: string;
  full_invoice_number?: string;
  taxable_subtotal: number;
  non_taxable_subtotal: number;
  total_vat: number;
  grand_total: number;
  global_discount_percentage?: number;
  global_discount_amount?: number;
  items: InvoiceItemResponseDto[];
  payments: InvoicePaymentResponseDto[];
  observations?: string;
  created_at: string;
  updated_at: string;
  version?: number;
  cae?: string;
  cae_expiration_date?: string;
  afip_authorization_date?: string;
}

/**
 * Invoice Item Response DTO
 */
export interface InvoiceItemResponseDto {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_percentage: number;
  account_plan_id: string;
  unit_of_measure: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  vat_amount: number;
  total_amount: number;
}

/**
 * Invoice Payment Response DTO
 */
export interface InvoicePaymentResponseDto {
  id: number;
  payment_method_id: string;
  account_plan_id: string;
  bank?: string;
  check_number?: string;
  validity_date?: string;
  amount: number;
  transaction_reference?: string;
  observations?: string;
}

/**
 * Invoice List Response DTO
 */
export interface InvoiceListResponseDto {
  invoices: InvoiceResponseDto[];
  total: number;
  page: number;
  limit: number;
}
