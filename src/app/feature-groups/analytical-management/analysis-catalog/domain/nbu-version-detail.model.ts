import { NbuVersion } from './nbu-version.model';

/**
 * Representa el detalle de un NBU en una versión específica del nomenclador.
 * Relaciona un código NBU con una versión particular del nomenclador.
 */
export interface NbuVersionDetail {
  id: number;
  nbu?: string;
  nbuVersion?: NbuVersion;
  ub?: number;
  entityVersion?: number;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}
