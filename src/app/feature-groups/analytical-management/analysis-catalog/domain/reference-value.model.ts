import { AgeRange } from './age-range.model';
import { MeasurementUnit } from './measurement-unit.model';

/**
 * Representa un valor de referencia para una determinación analítica.
 */
export interface ReferenceValue {
  id: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  minValue?: number;
  maxValue?: number;
  criticalMinValue?: number;
  criticalMaxValue?: number;
  ageRange?: AgeRange;
  measurementUnit?: MeasurementUnit;
  referenceTemplate?: string;
}
