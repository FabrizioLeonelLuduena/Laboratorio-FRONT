/**
 * Domain model for cash register session
 */
export interface CashRegister {
  id: number;
  userId: number;
  userName?: string;
  cashRegisterId: number;
  branchName?: string;
  openedAt: Date;
  closedAt?: Date;
  initialCash: number;
  finalCash?: number;
  status: CashRegisterStatus;
}

/**
 * Cash register session status
 */
export enum CashRegisterStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}
