import { MeasurementUnitDTO } from './measurement-unit.dto';

/**
 * DTO para AnalyticalMethod - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface AnalyticalMethodDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  analyticalType?: 'QUANTITATIVE' | 'QUALITATIVE';
  canBringSample?: boolean;
  measurementUnit?: MeasurementUnitDTO;
}
