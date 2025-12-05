import { PaymentMethod } from '../../domain/cash-movement.model';

/**
 * DTO for registering a deposit
 */
export interface DepositRequestDto {
  payment_method: PaymentMethod;
  amount: number;
  concept: string;
  observations?: string;
  voucher_number?: string;
  toMainRegister: boolean;
}


/**
 * DTO matching backend LiquidationDepositRequestDTO
 * - payment_method: required
 * - amount: required, min 0.01
 * - concept: required, max length 200
 * - observations: optional, max length 500
 * - voucher_number: optional external voucher/receipt number
 * - liquidation_id: required identifier of the liquidation to collect
 */
export interface DepositRequestLiquidationDto {
  paymentMethod: PaymentMethod;
  amount: number; // >= 0.01
  concept: string; // non-empty, max 200 chars
  observations?: string; // max 500 chars
  voucherNumber?: string;
  liquidationId: number;
}
