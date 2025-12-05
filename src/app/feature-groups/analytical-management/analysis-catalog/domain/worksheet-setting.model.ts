/**
 * Configuración de planilla de trabajo para una determinación.
 */
export interface WorksheetSetting {
  id: number;
  name?: string;
  description?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  workSectionId?: number;
}
