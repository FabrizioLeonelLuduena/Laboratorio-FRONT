import { AgeRangeDTO } from './age-range.dto';
import { MeasurementUnitDTO } from './measurement-unit.dto';

/**
 * DTO para ReferenceValue - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface ReferenceValueDTO {
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
  ageRange?: AgeRangeDTO;
  measurementUnit?: MeasurementUnitDTO;
  referenceTemplate?: string;
}
