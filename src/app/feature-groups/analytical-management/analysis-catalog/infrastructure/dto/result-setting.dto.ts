/**
 * DTO para ResultSetting - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface ResultSettingDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  isPrintable?: boolean;
  printOrder?: number;
  printGroup?: number;
  specialPrintName?: string;
  loadingResultOrder?: number;
  requiresLoadValue?: boolean;
  requiresApproval?: boolean;
  canSelfApprove?: boolean;
}
