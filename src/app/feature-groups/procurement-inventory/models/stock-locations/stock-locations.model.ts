/**
 * Stock Location Models
 * Represents locations with their associated supplies and batches
 */

/**
 * Batch information within a supply at a specific location
 */
export interface StockLocationBatchDTO {
  batchId: number;
  batchNumber: string;
  expirationDate: string;
  quantity: number;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  isActive: boolean;
}

/**
 * Supply information at a specific location
 */
export interface StockLocationSupplyDTO {
  supplyId: number;
  supplyName: string;
  supplySku: string;
  batches: StockLocationBatchDTO[];
}

/**
 * Stock location with supplies and batches
 */
export interface StockLocationDTO {
  id: number;
  locationName: string;
  locationType: string;
  locationLevel: string;
  locationAddress: string;
  supplies: StockLocationSupplyDTO[];
}

/**
 * Response type for stock locations endpoint
 */
export type StockLocationsResponseDTO = StockLocationDTO[];

