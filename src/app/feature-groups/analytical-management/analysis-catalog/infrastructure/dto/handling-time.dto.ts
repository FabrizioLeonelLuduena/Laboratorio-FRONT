/**
 * DTO para HandlingTime - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface HandlingTimeDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  timeValue?: number;
  timeUnit?: 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
}
