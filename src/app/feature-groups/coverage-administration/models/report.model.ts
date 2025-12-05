/**
 * Insurance report for summary panels
 */
export interface InsuranceReport {
  insurerName: string;   // Insurer name
  totalCases: number;    // Total number of records
  percentage: number;    // Percentage of total
}

/**
 * Report by period (monthly or weekly evolution)
 */
export interface TimeReport {
  period: string;        // Month or week (e.g., "January", "Week 42")
  totalCases: number;    // Total in that period
  variation?: number;    // Percentage change vs previous period
}

/**
 * General summary for the panel (top cards)
 */
export interface ReportSummary {
  totalCases: number;           // Overall total
  totalInsurers: number;        // Number of active insurers
  lastUpdate: string;           // Last update date (mock)
  variation: number;            // % overall change vs previous period
}

/**
 * Represents the monthly count of services per coverage type and insurer.
 */
export interface MonthlyServiceCountDTO {
  year: number;
  month: number;
  coverageType: string;
  insurerId: number;
  insurerName: string;
  servicesCount: number;
  totalAmount: number;
}

/**
 *
 */
export interface ServicesByTypeAndPayerDTO {
  coverageType: string;
  payerId: number;
  payerName: string;
  totalAmount: number;
  servicesCount: number;
}

/**
 *
 */
export interface CoverageRankingDTO {
  insurerId: number;
  insurerName: string;
  coverageType: string;
  totalAmount: number;
  servicesCount: number;
  rank: number;
  variationPercentage: number;
}
/**
 *
 */
export interface AnalisisRankingDTO{
  analysisId: number;
  analysisCode: string;
  analysisName: string;
  totalVolume: number;
  coverageBreakdown:AnalisisRankingCoverageDTO[];
}
/**
 *
 */
export interface AnalisisRankingCoverageDTO{
  insurerId: number;
  insurerName: string;
  volume: number;
}
/**
 *
 */
export interface CoveragesKPIsDTO
{
  totalBilledAmount: number;
  settledAmount: number;
  unsettledAmount: number;
  servicesCount: number;
  settledServicesCount: number;
  unsettledServicesCount: number;
  settlementPercentage: number;
  settlementCount:number;
  averageAmountPerService: number;
}
