import { CashMovement } from './cash-movement.model';
import { CashRegister } from './cash-register.model';

/**
 * Financial summary for cash register
 */
export interface CashSummary {
  initialCashAmount: number;
  initialCardAmount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalCash: number;
  totalCard: number;
  totalGeneral: number;
  movementCount: number;
}

/**
 * Dashboard metrics with complete financial overview
 */
export interface DashboardMetrics {
  currentCashRegister: CashRegister | null;
  dailySummary: CashSummary;
  recentMovements: CashMovement[];
  quickMetrics: {
    salesToday: number;
    collectionsToday: number;
    expensesToday: number;
    availableBalance: number;
  };
}
