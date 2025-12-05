import { CashRegister, CashRegisterStatus } from '../domain/cash-register.model';
import { OpenSessionRequestDto } from '../dto/request/open-session.dto';
import { CashSessionDto, SessionStatus } from '../dto/response/cash-session.dto';
import { CashOpeningFormValue } from '../view-models/cash-opening.vm';

/**
 * CashSessionMapper provides static methods to transform between domain models and DTOs for cash register sessions.
 * It is responsible for mapping backend session data to frontend models and vice versa, as well as form data to request DTOs.
 */
export class CashSessionMapper {
  /**
   * Maps a backend CashSessionDto to a CashRegister domain model.
   * @param dto - The session DTO received from the backend
   * @returns {CashRegister} The mapped domain model
   */
  static dtoToDomain(dto: CashSessionDto): CashRegister {
    return {
      id: dto.sessionId,
      userId: dto.userId,
      cashRegisterId: dto.cashRegisterId,
      openedAt: new Date(dto.openedAt),
      closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
      initialCash: dto.initialCash,
      finalCash: dto.finalCash,
      status: dto.status === SessionStatus.OPEN ? CashRegisterStatus.OPEN : CashRegisterStatus.CLOSED
    };
  }

  /**
   * Maps a CashRegister domain model to a backend CashSessionDto for updates.
   * @param domain - The domain model to convert
   * @returns {CashSessionDto} The DTO for backend consumption
   */
  static domainToDto(domain: CashRegister): CashSessionDto {
    return {
      sessionId: domain.id,
      userId: domain.userId,
      cashRegisterId: domain.cashRegisterId,
      openedAt: domain.openedAt.toISOString(),
      closedAt: domain.closedAt?.toISOString(),
      initialCash: domain.initialCash,
      finalCash: domain.finalCash,
      status: domain.status === CashRegisterStatus.OPEN ? SessionStatus.OPEN : SessionStatus.CLOSED
    };
  }

  /**
   * Maps opening form data to an OpenSessionRequestDto for backend requests.
   * @param formValue - The opening form data
   * @param cashRegisterId - The cash register ID to open
   * @returns {OpenSessionRequestDto} The DTO for backend session opening requests
   */
  static formToRequestDto(formValue: CashOpeningFormValue, cashRegisterId: number): OpenSessionRequestDto {
    return {
      cash_register_id: cashRegisterId,
      initial_cash: formValue.initialCashAmount
      // observations: formValue.observations?.trim() || null -> uncomment when the field is available in the endpoint DTO
    };
  }
}
