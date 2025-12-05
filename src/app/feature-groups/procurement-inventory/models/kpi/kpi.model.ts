/**
 * Generic KPI response structure from backend
 * Used for all KPI endpoints that return label/value pairs
 */
export interface KpiResponseDTO {
  data: KpiDataPoint[];
  appliedFilters: KpiFiltersDTO;
}

/**
 * Individual data point in a KPI response
 */
export interface KpiDataPoint {
  label: string;
  value: number;
}

/**
 * Filters applied to KPI queries
 */
export interface KpiFiltersDTO {
  startDate: string | null;
  endDate: string | null;
  supplierId: number | null;
  locationId: number | null;
  supplyId: number | null;
}

/**
 * Parameters for querying KPIs with date ranges
 */
export interface KpiDateRangeParams {
  startDate: string; // Format: "yyyy-MM-dd"
  endDate: string;   // Format: "yyyy-MM-dd"
  locationId?: number;
  supplierId?: number;
  supplyId?: number;
}

