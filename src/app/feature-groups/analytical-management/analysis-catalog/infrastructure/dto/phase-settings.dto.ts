import { AnalyticalMethodDTO } from './analytical-method.dto';
import { ReferenceValueDTO } from './reference-value.dto';

/**
 * DTO para PreAnalyticalPhaseSetting - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface PreAnalyticalPhaseSettingDTO {
  id: number;
  observations?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  preIndications?: string;
}

/**
 * DTO para AnalyticalPhaseSetting - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface AnalyticalPhaseSettingDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  analyticalMethod?: AnalyticalMethodDTO;
}

/**
 * DTO para PostAnalyticalPhaseSetting - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface PostAnalyticalPhaseSettingDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  referenceValues?: ReferenceValueDTO[];
}
