import { NbuVersionDetail } from './nbu-version-detail.model';
import { SpecificStandardInterpretation } from './specific-standard-interpretation.model';

/**
 * Representa un código NBU (Nomenclador Bioquímico Único).
 * Estándar de nomenclatura para prácticas bioquímicas.
 */
export interface Nbu {
  id: number;
  abbreviations?: string[];
  synonyms?: string[];
  determination?: string;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  nbuCode: number;
  nbuType?: 'PMO' | 'PE';
  nbuVersionDetails?: NbuVersionDetail[];
  isUrgency?: boolean;
  isByReference?: boolean;
  isInfrequent?: boolean;
  specificStandardInterpretation?: SpecificStandardInterpretation;
  interpretation?: string;
  minimumWorkStandard?: string;
}
