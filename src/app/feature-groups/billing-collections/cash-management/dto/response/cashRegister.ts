/**
 *
 */
export interface CashRegisterDTO {
  /** Unique identifier of the cash register. */
  registerId: number;

  /** Identifier of the branch to which it belongs. */
  branchId: number;

  /** Description of the cash register. */
  description: string;

  /** Status of the cash register: active or inactive. */
  status: boolean;
}

/**
 *
 */
export interface CashRegisterOption {
  id: number;
  description: string;
}
