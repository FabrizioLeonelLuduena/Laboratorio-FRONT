/**
 * Interpretación estándar específica de un NBU.
 */
export interface SpecificStandardInterpretation {
  id: number;
  interpretation?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  minimumWorkStandard?: string;
}
