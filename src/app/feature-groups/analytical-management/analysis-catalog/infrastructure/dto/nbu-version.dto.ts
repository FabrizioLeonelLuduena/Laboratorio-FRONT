/**
 * DTO para NbuVersion - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface NbuVersionDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  versionCode: string;
  publicationYear?: number;
  updateYear?: number;
  publicationDate?: string;
  effectivityDate?: string;
  endDate?: string;
}
