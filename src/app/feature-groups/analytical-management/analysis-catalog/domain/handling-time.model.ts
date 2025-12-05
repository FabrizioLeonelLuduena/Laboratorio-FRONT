/**
 * Representa el tiempo de manipulación/procesamiento de una muestra.
 */
export interface HandlingTime {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  timeValue?: number;
  timeUnit?: 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
}
