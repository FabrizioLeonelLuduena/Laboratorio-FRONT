/**
 * Representa una unidad de medida para resultados de análisis.
 */
export interface MeasurementUnit {
  id: number;
  name: string;
  symbol: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
