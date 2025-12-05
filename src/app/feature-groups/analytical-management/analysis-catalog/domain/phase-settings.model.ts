import { AnalyticalMethod } from './analytical-method.model';
import { ReferenceValue } from './reference-value.model';

/**
 * Configuración de la fase pre-analítica.
 */
export interface PreAnalyticalPhaseSetting {
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
 * Configuración de la fase analítica.
 */
export interface AnalyticalPhaseSetting {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  analyticalMethod?: AnalyticalMethod;
}

/**
 * Configuración de la fase post-analítica.
 */
export interface PostAnalyticalPhaseSetting {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  referenceValues?: ReferenceValue[];
}
