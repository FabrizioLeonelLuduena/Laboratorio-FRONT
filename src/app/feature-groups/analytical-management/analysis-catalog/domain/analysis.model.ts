import { Determination } from './determination.model';
import { Nbu } from './nbu.model';
import { SampleType } from './sample-type.model';
import { WorksheetSetting } from './worksheet-setting.model';

/**
 * Representa un análisis clínico en el sistema.
 * Entidad principal del catálogo de análisis.
 */
export interface Analysis {
  id: number;
  name: string;
  description?: string;
  code?: string;
  nbu?: Nbu;
  ub?: number;
  determinations?: Determination[];
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  shortCode?: number;
  familyName?: string;
  sampleType?: SampleType;
  worksheetSetting?: WorksheetSetting;
}
