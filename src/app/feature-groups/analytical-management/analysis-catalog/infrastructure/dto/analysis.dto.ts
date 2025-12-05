import { DeterminationDTO } from './determination.dto';
import { NbuDTO } from './nbu.dto';
import { SampleTypeDTO } from './sample-type.dto';
import { WorksheetSettingDTO } from './worksheet-setting.dto';

/**
 * DTO para Analysis - Formato camelCase (después de pasar por caseConverterInterceptor).
 * El interceptor convierte automáticamente de snake_case (backend) a camelCase (frontend).
 */
export interface AnalysisDTO {
  id: number;
  name: string;
  description?: string;
  code?: string;
  nbu?: NbuDTO;
  ub?: number;
  determinations?: DeterminationDTO[];
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  shortCode?: number;
  familyName?: string;
  sampleType?: SampleTypeDTO;
  worksheetSetting?: WorksheetSettingDTO;
}
