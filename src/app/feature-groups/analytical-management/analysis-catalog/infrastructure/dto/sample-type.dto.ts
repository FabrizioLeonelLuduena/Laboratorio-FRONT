/**
 * DTO for SampleType - camelCase format (after passing through caseConverterInterceptor).
 */
export interface SampleTypeDTO {
  id?: number;
  name: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
