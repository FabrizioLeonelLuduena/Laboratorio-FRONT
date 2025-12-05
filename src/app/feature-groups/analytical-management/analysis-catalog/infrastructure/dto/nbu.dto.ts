import { NbuVersionDetailDTO } from './nbu-version-detail.dto';
import { SpecificStandardInterpretationDTO } from './specific-standard-interpretation.dto';

/**
 * DTO para NBU - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface NbuDTO {
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
  nbuVersionDetails?: NbuVersionDetailDTO[];
  isUrgency?: boolean;
  isByReference?: boolean;
  isInfrequent?: boolean;
  specificStandardInterpretation?: SpecificStandardInterpretationDTO;
}
