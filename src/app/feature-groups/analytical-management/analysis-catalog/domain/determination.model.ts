import { HandlingTime } from './handling-time.model';
import { PreAnalyticalPhaseSetting, AnalyticalPhaseSetting, PostAnalyticalPhaseSetting } from './phase-settings.model';
import { ResultSetting } from './result-setting.model';

/**
 * Representa una determinación analítica.
 * Una determinación es una prueba específica dentro de un análisis.
 */
export interface Determination {
  id: number;
  name: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  percentageVariationTolerated?: number;
  preAnalyticalPhaseSetting?: PreAnalyticalPhaseSetting;
  analyticalPhaseSetting?: AnalyticalPhaseSetting;
  postAnalyticalPhaseSetting?: PostAnalyticalPhaseSetting;
  resultSetting?: ResultSetting;
  handlingTime?: HandlingTime;
}
