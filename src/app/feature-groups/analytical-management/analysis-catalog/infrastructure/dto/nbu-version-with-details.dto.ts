import { NbuDTO } from './nbu.dto';

/**
 * DTO para versión NBU con detalles de NBUs asociados.
 * Refleja la respuesta de:
 * GET /api/v1/analysis/nbu/versions/nbu_detail
 *
 * Nota: El interceptor de case convierte snake_case ↔ camelCase,
 * por lo que aquí usamos camelCase.
 */
export interface NbuVersionWithDetailsDTO {
  id: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
  versionCode: string;
  publicationYear?: number;
  updateYear?: number;
  publicationDate?: string;
  effectivityDate?: string;
  endDate?: string;
  /** List of NBUs associated with the version */
  nbuDetails?: Array<{
    nbu: NbuDTO;
    ub: number;
  }>;
}