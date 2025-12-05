/**
 * Data Transfer Objects for Billing Reports API.
 * Mirrors backend DTOs from ar.edu.utn.frc.tup.p4.dtos.reports package.
 */

// ==================== REPORT RESPONSE DTOs ====================

/**
 * Response for total invoiced amount report.
 */
export interface InvoicedTotalResponse {
  dateFrom: string;
  dateTo: string;
  totalInvoiced: number;
}

/**
 * Breakdown by insurer type within a branch.
 */
export interface InsurerTypeBreakdown {
  insurerType: string;
  totalInvoiced: number;
}

/**
 * Total invoiced for a specific branch.
 */
export interface BranchTotal {
  branchId: number;
  totalInvoiced: number;
  insurerTypeBreakdown: InsurerTypeBreakdown[];
}

/**
 * Response for invoiced totals by branch.
 */
export interface InvoicedByBranchResponse {
  dateFrom: string;
  dateTo: string;
  branchTotals: BranchTotal[];
}

/**
 * Total invoiced for a specific insurer.
 */
export interface InsurerTotal {
  insurerId: number;
  insurerName: string;
  totalInvoiced: number;
}

/**
 * Response for invoiced totals by insurer.
 */
export interface InvoicedByInsurerResponse {
  dateFrom: string;
  dateTo: string;
  insurerTotals: InsurerTotal[];
}

/**
 * Response comparing invoiced vs pending amounts.
 */
export interface InvoicedVsPendingResponse {
  dateFrom: string;
  dateTo: string;
  totalInvoiced: number;
  totalPending: number;
  pendingOverInvoicedRatio: number;
}

/**
 * Response for invoiced amount minus costs.
 */
export interface InvoicedMinusCostsResponse {
  dateFrom: string;
  dateTo: string;
  totalInvoiced: number;
  totalCosts: number;
  netTotal: number;
}

/**
 * Response for comparative period analysis.
 */
export interface ComparativeReportResponse {
  comparisonType: 'CONSECUTIVE' | 'SAME_PERIOD_LAST_YEAR';
  currentPeriodFrom: string;
  currentPeriodTo: string;
  currentPeriodTotal: number;
  comparisonPeriodFrom: string;
  comparisonPeriodTo: string;
  comparisonPeriodTotal: number;
  absoluteDifference: number;
  percentageChange: number;
}

// ==================== KPI DTOs ====================

/**
 * KPI for total invoiced in a specific month.
 */
export interface MonthTotalKPI {
  month: number;
  year: number;
  totalInvoiced: number;
}

/**
 * KPI for year-to-date total invoiced amount.
 */
export interface YTDTotalKPI {
  year: number;
  totalInvoicedYtd: number;
}

/**
 * Data for a specific insurer type in the breakdown.
 */
export interface InsurerTypeData {
  insurerType: string;
  totalInvoiced: number;
  percentage: number;
}

/**
 * KPI for invoiced amounts by insurer type.
 */
export interface InsurerTypeKPI {
  dateFrom: string;
  dateTo: string;
  totalInvoiced: number;
  byInsurerType: InsurerTypeData[];
}

/**
 * Data for a specific branch in the breakdown.
 */
export interface BranchData {
  branchId: number;
  totalInvoiced: number;
}

/**
 * KPI for total invoiced by branch.
 */
export interface BranchTotalKPI {
  dateFrom: string;
  dateTo: string;
  byBranch: BranchData[];
}

/**
 * KPI for ratio of pending to invoiced amounts.
 */
export interface InvoicedPendingRatioKPI {
  totalInvoiced: number;
  totalPending: number;
  pendingOverInvoicedRatio: number;
}

/**
 * KPI for ratio of invoiced to costs.
 */
export interface InvoicedCostsRatioKPI {
  totalInvoiced: number;
  totalCosts: number;
  invoicedOverCostsRatio: number;
}

/**
 * Data for a top-ranked insurer.
 */
export interface InsurerData {
  rank: number;
  insurerId: number;
  insurerName: string;
  totalInvoiced: number;
  percentage: number;
}

/**
 * KPI for top insurers by invoiced amount.
 */
export interface TopInsurersKPI {
  dateFrom: string;
  dateTo: string;
  totalInvoiced: number;
  topInsurers: InsurerData[];
}

/**
 * KPI for month-over-month growth analysis.
 */
export interface MonthOverMonthGrowthKPI {
  currentMonth: number;
  currentYear: number;
  currentMonthTotal: number;
  previousMonth: number;
  previousYear: number;
  previousMonthTotal: number;
  absoluteDifference: number;
  percentageChange: number;
}
