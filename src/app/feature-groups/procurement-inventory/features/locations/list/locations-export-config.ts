/**
 * Locations export configuration
 * Defines the column structure for location exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';
import { ResponseLocationDTO } from '../../../models/locations/locations.model';

/**
 * Location display row type for exports.
 * Alias de ResponseLocationDTO con posibles campos calculados.
 */
export type LocationDisplayRow = ResponseLocationDTO & {
  // locationType en el listado ya viene como label amigable
  locationType: string;
};

/**
 * Column definitions for location Excel exports
 */
export const LOCATION_EXPORT_COLUMNS: ExportColumn<LocationDisplayRow>[] = [
  {
    header: 'Nombre',
    getValue: (location) => location.name || '-',
    width: 30
  },
  {
    header: 'Tipo',
    getValue: (location) => location.locationType || '-',
    width: 25
  },
  {
    header: 'Ubicación Padre',
    getValue: (location) => location.parentLocationName || '-',
    width: 30
  },
  {
    header: 'Dirección',
    getValue: (location) => location.address || '-',
    width: 50
  },
  {
    header: 'Estado',
    getValue: (location) => (location.isActive ? 'Activo' : 'Inactivo'),
    width: 12
  }
];

/**
 * Column definitions for location PDF exports (abbreviated headers)
 */
export const LOCATION_PDF_COLUMNS: ExportColumn<LocationDisplayRow>[] = [
  {
    header: 'Nombre',
    getValue: (location) => location.name || '-',
    width: 35
  },
  {
    header: 'Tipo',
    getValue: (location) => location.locationType || '-',
    width: 30
  },
  {
    header: 'Ubicación Padre',
    getValue: (location) => location.parentLocationName || '-',
    width: 35
  },
  {
    header: 'Dirección',
    getValue: (location) => location.address || '-',
    width: 50
  },
  {
    header: 'Estado',
    getValue: (location) => (location.isActive ? 'Activo' : 'Inactivo'),
    width: 18
  }
];

