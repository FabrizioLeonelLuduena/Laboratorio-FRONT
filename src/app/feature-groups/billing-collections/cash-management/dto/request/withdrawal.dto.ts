import { PaymentMethod } from '../../domain/cash-movement.model';
/**
 * DTO for registering a withdrawal
 */
export interface WithdrawalRequestDto {
  paymentMethod: PaymentMethod
  amount: number;
  concept: string;
  observations?: string;
  voucher_number?: string;
  toMainRegister: boolean;
}
