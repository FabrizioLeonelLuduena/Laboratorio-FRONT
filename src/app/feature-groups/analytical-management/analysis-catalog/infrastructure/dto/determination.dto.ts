import { HandlingTimeDTO } from './handling-time.dto';
import { PreAnalyticalPhaseSettingDTO, AnalyticalPhaseSettingDTO, PostAnalyticalPhaseSettingDTO } from './phase-settings.dto';
import { ResultSettingDTO } from './result-setting.dto';

/**
 * DTO para Determination - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface DeterminationDTO {
  id: number;
  name: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  percentageVariationTolerated?: number;
  preAnalyticalPhaseSetting?: PreAnalyticalPhaseSettingDTO;
  analyticalPhaseSetting?: AnalyticalPhaseSettingDTO;
  postAnalyticalPhaseSetting?: PostAnalyticalPhaseSettingDTO;
  resultSetting?: ResultSettingDTO;
  handlingTime?: HandlingTimeDTO;
}
