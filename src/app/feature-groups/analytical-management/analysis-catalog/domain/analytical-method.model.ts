import { MeasurementUnit } from './measurement-unit.model';
/**
 * Representa un método analítico para realizar una determinación.
 */
export interface AnalyticalMethod {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  analyticalType?: 'QUANTITATIVE' | 'QUALITATIVE';
  canBringSample?: boolean;
  measurementUnit?: MeasurementUnit;
}
