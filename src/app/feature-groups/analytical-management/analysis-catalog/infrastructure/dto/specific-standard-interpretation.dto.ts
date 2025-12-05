/**
 * DTO para SpecificStandardInterpretation - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface SpecificStandardInterpretationDTO {
  id: number;
  interpretation?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  minimumWorkStandard?: string;
}
