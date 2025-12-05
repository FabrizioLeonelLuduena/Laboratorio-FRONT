/**
 * DTO for WorksheetSetting - camelCase format (after passing through caseConverterInterceptor).
 */
export interface WorksheetSettingDTO {
  id?: number;
  name?: string;
  description?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  workSectionId?: number;
}
