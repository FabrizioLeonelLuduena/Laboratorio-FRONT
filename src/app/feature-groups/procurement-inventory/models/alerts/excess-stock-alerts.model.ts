/**
 * Excess Stock Alert DTO (RF-23)
 * Represents an alert for supplies exceeding maximum threshold
 */
export interface ExcessStockAlertDTO {
  supplyId: number;
  supplyName: string;
  locationId: number;
  locationName: string;
  currentStock: number;
  maximumStock: number;
  excess: number;
  excessPercentage: number;
  severity: 'WARNING' | 'CRITICAL';
}

/**
 * Response wrapper for excess stock alerts
 */
export interface ExcessStockAlertsResponseDTO {
  alerts: ExcessStockAlertDTO[];
}
