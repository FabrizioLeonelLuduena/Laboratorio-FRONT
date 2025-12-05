/**
 * DTO representing cash summary response from backend
 */
export interface CashSummaryResponse {
  totalCash: number
  movementCount: number
  breakdown?: TransactionBreakdown
}

/**
 * Represents breakdown of transactions by payment method
 */
export interface TransactionBreakdown {
  cash: number
  qr: number
  card: number
  transfer: number
  total: number
}

/**
 * Represents a row in the transaction table
 */
export interface TransactionTableRow extends Record<string, unknown> {
  type: string
  cash: string
  qr: string
  card: string
  transfer: string
  total: string
}
