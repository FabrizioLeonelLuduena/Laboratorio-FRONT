/**
 * Representa un tipo de muestra para análisis clínicos.
 */
export interface SampleType {
  id: number;
  name: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
