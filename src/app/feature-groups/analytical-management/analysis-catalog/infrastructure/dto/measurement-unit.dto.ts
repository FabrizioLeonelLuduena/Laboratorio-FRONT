/**
 * DTO para MeasurementUnit - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface MeasurementUnitDTO {
  id: number;
  name: string;
  symbol: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
