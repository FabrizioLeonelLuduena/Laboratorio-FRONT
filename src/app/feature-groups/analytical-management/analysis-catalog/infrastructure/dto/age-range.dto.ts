/**
 * DTO para AgeRange - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface AgeRangeDTO {
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
