/**
 * PaymentMethodType
 *
 * Represents the available payment methods for transactions.
 * Used to ensure type safety and consistency across forms and backend operations.
 */
export type PaymentMethodType =
  | 'cash' // Physical cash payment
  | 'debit_card' // Payment via debit card
  | 'credit_card' // Payment via credit card
  | 'transfer'; // Bank or electronic transfer

/**
 * MovementType
 *
 * Represents the type of financial movement recorded in the cash register.
 * Helps distinguish between incoming and outgoing transactions.
 */
export type MovementType =
  | 'deposit' // Incoming payment or deposit
  | 'withdrawal'; // Outgoing cash withdrawal
