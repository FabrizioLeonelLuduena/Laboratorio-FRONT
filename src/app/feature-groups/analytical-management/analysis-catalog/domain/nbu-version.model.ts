/**
 * Representa una versión del nomenclador NBU.
 * El nomenclador se actualiza periódicamente con nuevas versiones.
 */
export interface NbuVersion {
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
}
