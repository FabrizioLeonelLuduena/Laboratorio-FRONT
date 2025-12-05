/**
 * Severity levels for alerts
 */
export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
  EXPIRED = 'EXPIRED'
}

/**
 * Critical Stock Alert DTO
 * Represents an alert for supplies with stock below minimum threshold
 */
export interface CriticalStockAlertDTO {
  supplyId: number;
  supplyName: string;
  supplyCode: string;
  locationId: number;
  locationName: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  severity: AlertSeverity;
}

/**
 * Batch Alert DTO (for expiring or expired batches)
 * Represents an alert for batches close to expiration or already expired
 */
export interface BatchAlertDTO {
  batchId: number;
  batchNumber: string;
  supplyId: number;
  supplyName: string;
  supplyCode: string;
  expirationDate: string; // Format: "yyyy-MM-dd"
  daysUntilExpiration: number;
  initialQuantity: number;
  remainingQuantity: number;
  status: string;
  supplierName: string;
  severity: AlertSeverity;
}

/**
 * Alert Summary DTO
 * Consolidated summary with counters and details of all alert types
 */
export interface AlertSummaryDTO {
  criticalStockCount: number;
  expiringBatchesCount: number;
  expiredBatchesCount: number;
  totalAlerts: number;
  criticalStockAlerts: CriticalStockAlertDTO[];
  expiringBatchAlerts: BatchAlertDTO[];
  expiredBatchAlerts: BatchAlertDTO[];
}

/**
 * Alert filter parameters
 */
export interface AlertFiltersDTO {
  daysAhead?: number; // Days ahead for expiring batches (default: 30)
}
