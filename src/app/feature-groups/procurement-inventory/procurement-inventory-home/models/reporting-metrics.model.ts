/**
 * Model for the main metrics of the reporting section.
 */
export interface ReportingMetric {
  label: string;
  value: string;
  subtext: string;
  icon: string;
  description: string;
}

/**
 * Model for delivery time data by provider
 */
export interface ProviderDeliveryTimeData {
  name: string;
  deliveryTime: number; // in days
}

/**
 * Model for transfer data by location
 */
export interface LocationTransferData {
  name: string;
  value: number;
}

/**
 * Model for average of items by location
 */
export interface LocationAverageData {
  location: string;
  average: number;
}

/**
 * Model for returns by provider
 */
export interface ProviderReturnData {
  supplier: string;
  returns: number;
}

/**
 * Model for critical supply (Top 5)
 */
export interface CriticalSupply {
  id: number;
  name: string;
  quantity: number;
  demand: 'Critical' | 'High' | 'Medium' | 'Low';
  percentage: number;
}

/**
 * Model for supplies with low movement
 */
export interface LowMovementSupply {
  name: string;
  lastMovement: string;
  quantity: number;
}

/**
 * Model for help content
 */
export interface HelpContent {
  mainMetrics: Record<string, string>;
  charts: Record<string, string>;
}

/**
 * Model for purchase volume by provider
 */
export interface PurchaseVolumeByProvider {
  provider: string;
  orders: number;
}

/**
 * Model for orders by month
 */
export interface OrdersByMonth {
  month: string;
  orders: number;
}

/**
 * Model for inventory rotation level
 */
export interface InventoryRotation {
  supply: string;
  movements: number;
  status: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Model for processing time by month
 */
export interface ProcessingTimeByMonth {
  month: string;
  hours: number;
}

/**
 * Model for egress by location
 */
export interface EgressByLocation {
  location: string;
  supplies: number;
  returns: number;
  total: number;
}

/**
 * Model for reporting filters
 */
export interface ReportingFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  provider?: string | number | null;
  location?: string | number | null;
  supply?: string | number | null;
}

