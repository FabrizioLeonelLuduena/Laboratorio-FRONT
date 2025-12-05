import { NbuVersionDTO } from './nbu-version.dto';

/**
 * DTO para NbuVersionDetail - Formato camelCase (después de pasar por caseConverterInterceptor).
 */
export interface NbuVersionDetailDTO {
  id: number;
  nbu?: string;
  nbuVersion?: NbuVersionDTO;
  ub?: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
