/**
 * DTO for opening a new cash session
 */
export interface OpenSessionRequestDto {
  cash_register_id: number;
  initial_cash: number;
  observations?: string | null;
}
