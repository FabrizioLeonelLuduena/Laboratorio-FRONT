/**
 * Configuración de resultados para una determinación.
 * Define cómo se imprimen, cargan y aprueban los resultados.
 */
export interface ResultSetting {
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
