/**
 * View model for cash dashboard display
 */
export interface CashDashboardViewModel {
  session: {
    isOpen: boolean;
    isLoading: boolean;
    data: any | null;
  };
  metrics: {
    isLoading: boolean;
    data: {
      currentCashRegister: any;
      dailySummary: {
        initialCashAmount: number;
        initialCardAmount: number;
        totalDeposits: number;
        totalWithdrawals: number;
        totalCash: number;
        totalCard: number;
        totalGeneral: number;
        movementCount: number;
      };
      recentMovements: any[];
      quickMetrics: {
        salesToday: number;
        collectionsToday: number;
        expensesToday: number;
        availableBalance: number;
      };
    } | null;
  };
  error: {
    hasError: boolean;
    message: string | null;
  };
  actions: {
    canOpen: boolean;
    canDeposit: boolean;
    canWithdraw: boolean;
    canClose: boolean;
  };
}

/**
 * View model for dashboard quick actions
 */
export interface DashboardQuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
  description: string;
}

/**
 * View model for dashboard metrics display
 */
export interface DashboardMetricsDisplay {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: 'success' | 'danger' | 'warning' | 'info';
}

/**
 * View model for recent movements display
 */
export interface RecentMovementDisplay {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  concept: string;
  timestamp: Date;
  paymentMethod: string;
  severity: 'success' | 'danger';
  label: string;
}
