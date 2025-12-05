/**
 * Representa un rango de edad para valores de referencia.
 */
export interface AgeRange {
  id: number;
  name: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  minValue?: number;
  maxValue?: number;
  timeUnit?: 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
}
