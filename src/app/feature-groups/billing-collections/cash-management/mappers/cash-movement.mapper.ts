import { CashMovement, MovementType, PaymentMethod } from '../domain/cash-movement.model';
import { DepositRequestDto, DepositRequestLiquidationDto } from '../dto/request/deposit.dto';
import { WithdrawalRequestDto } from '../dto/request/withdrawal.dto';
import { TransactionDto } from '../dto/response/transaction.dto';

/**
 * CashMovementMapper provides static methods to transform between domain models and DTOs for cash movements.
 * It is responsible for mapping backend data to frontend models and vice versa, as well as form data to request DTOs.
 */
export class CashMovementMapper {
  /**
   * Maps a backend TransactionDto to a CashMovement domain model.
   * @param dto - The transaction DTO received from the backend
   * @returns {CashMovement} The mapped domain model
   */
  static dtoToDomain(dto: TransactionDto): CashMovement {

    return {
      id: dto.transactionId,
      sessionId: dto.cashSessionId,
      type: dto.transactionType === 'INFLOW' ? MovementType.DEPOSIT : MovementType.WITHDRAWAL,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod as PaymentMethod,
      reason: dto.reason,
      transactionDate: new Date(dto.transactionDate),
      userId: 0, // Not provided by backend DTO
      canceled: dto.canceled,
      newAmount: dto.newAmount,
      previousAmount: dto.previousAmount ?? 0,
      isFromAttention: dto.isFromAttention
    };
  }

  /**
   * Maps a CashMovement domain model to a backend TransactionDto.
   * @param domain - The domain model to convert
   * @returns {TransactionDto} The DTO for backend consumption
   */
  static domainToDto(domain: CashMovement): TransactionDto {
    return {
      transactionId: domain.id,
      cashSessionId: domain.sessionId,
      transactionType: domain.type === MovementType.DEPOSIT ? 'INFLOW' : 'OUTFLOW',
      paymentMethod: domain.paymentMethod,
      amount: domain.amount,
      previousAmount : domain.previousAmount,
      reason: domain.reason,
      transactionDate: domain.transactionDate.toISOString(),
      canceled: domain.canceled,
      newAmount: domain.newAmount,
      isFromAttention: domain.isFromAttention
    };
  }

  /**
   * Maps deposit form data to a DepositRequestDto for backend requests.
   * @param formValue - The deposit form data
   * @param toMainRegister big box.
   * @returns {DepositRequestDto} The DTO for backend deposit requests
   */
  static depositFormToRequestDto(formValue: { paymentMethod: string; amount: number; concept: string; observations?: string; receiptNumber?: string }, toMainRegister: boolean): DepositRequestDto {
    return {
      payment_method: this.mapFrontendToBackendPaymentMethod(formValue.paymentMethod),
      amount: formValue.amount,
      concept: formValue.concept,
      observations: formValue.observations,
      voucher_number: formValue.receiptNumber,
      toMainRegister: toMainRegister
    };
  }
  /**
   * Maps deposit form data to a DepositRequestLiquidationDTO for backend requests.
   * @param formValue - The deposit form data
   * @returns {DepositRequestLiquidationDto} The DTO for backend deposit requests
   */
  static depositFormLiquidationToRequestDto(formValue: { paymentMethod: string; amount: number; concept: string;
    observations?: string; receiptNumber?: string ; liquidationId: number;}): DepositRequestLiquidationDto {
    return {
      paymentMethod: this.mapFrontendToBackendPaymentMethod(formValue.paymentMethod),
      amount: formValue.amount,
      concept: formValue.concept,
      observations: formValue.observations,
      voucherNumber: formValue.receiptNumber,
      liquidationId: formValue.liquidationId
    };
  }

  /**
   * Maps withdrawal form data to a WithdrawalRequestDto for backend requests.
   * @param formValue - The withdrawal form data
   * @returns {WithdrawalRequestDto} The DTO for backend withdrawal requests
   */
  static withdrawalFormToRequestDto(formValue: { paymentMethod: string, amount: number; concept: string;
    observations?: string; receiptNumber?: string }, toMainRegister: boolean): WithdrawalRequestDto {
    return {
      paymentMethod: this.mapFrontendToBackendPaymentMethod(formValue.paymentMethod),
      amount: formValue.amount,
      concept: formValue.concept,
      observations: formValue.observations,
      voucher_number: formValue.receiptNumber,
      toMainRegister: toMainRegister
    };
  }

  /**
   * Maps a frontend payment method string to the backend PaymentMethod enum.
   * @param frontendMethod - The payment method string from the frontend
   * @returns {PaymentMethod} The corresponding backend enum value
   */
  private static mapFrontendToBackendPaymentMethod(frontendMethod: string): PaymentMethod {
    const methodMap: { [key: string]: PaymentMethod } = {
      'Efectivo': PaymentMethod.CASH, // Mapping for deposit form
      'cash': PaymentMethod.CASH, // Mapping for withdrawal form
      'debit_card': PaymentMethod.DEBIT_CARD,
      'credit_card': PaymentMethod.CREDIT_CARD,
      'transfer': PaymentMethod.TRANSFER,
      'bank_transfer': PaymentMethod.TRANSFER,
      'qr': PaymentMethod.QR
    };
    return methodMap[frontendMethod] || PaymentMethod.CASH;
  }

  /**
   * Returns a user-friendly label for a payment method.
   * @param method - The payment method (enum or string)
   * @returns {string} The label for display purposes
   */
  static getPaymentMethodLabel(method: PaymentMethod | string): string {
    const labels: { [key: string]: string } = {
      'CASH': 'Efectivo',
      'cash': 'Efectivo',
      'DEBIT_CARD': 'Tarjeta de Débito',
      'debit_card': 'Tarjeta de Débito',
      'CREDIT_CARD': 'Tarjeta de Crédito',
      'credit_card': 'Tarjeta de Crédito',
      'TRANSFER': 'Transferencia',
      'transfer': 'Transferencia',
      'QR': 'QR',
      'qr': 'QR'
    };
    return labels[method] || method;
  }
}
