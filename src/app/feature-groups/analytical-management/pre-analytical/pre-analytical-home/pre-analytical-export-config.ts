/**
 * Pre-analytical export configuration
 * Defines the column structure for pre-analytical exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';

import * as PreAnalyticalDataHelpers from './pre-analytical-data-helpers.util';

/**
 * Column definitions for standard views (Ingreso de muestra, En preparación, En derivación)
 * Used by Excel export service
 */
export const PRE_ANALYTICAL_STANDARD_EXPORT_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => PreAnalyticalDataHelpers.formatDate(row.date),
    width: 15
  },
  {
    header: 'Protocolo',
    getValue: (row) => PreAnalyticalDataHelpers.getProtocol(row.protocol),
    width: 15
  },
  {
    header: 'Nombre de Paciente',
    getValue: (row) => PreAnalyticalDataHelpers.getPatientName(row.patientName),
    width: 30
  },
  {
    header: 'Área Destino',
    getValue: (row) => PreAnalyticalDataHelpers.getArea(row.area),
    width: 20
  },
  {
    header: 'Estado',
    getValue: (row) => PreAnalyticalDataHelpers.getStatus(row.status),
    width: 18
  }
];

/**
 * PDF column definitions for standard views
 */
export const PRE_ANALYTICAL_STANDARD_PDF_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => PreAnalyticalDataHelpers.formatDate(row.date),
    width: 16
  },
  {
    header: 'Protocolo',
    getValue: (row) => PreAnalyticalDataHelpers.getProtocol(row.protocol),
    width: 14
  },
  {
    header: 'Paciente',
    getValue: (row) => PreAnalyticalDataHelpers.getPatientName(row.patientName),
    width: 24
  },
  {
    header: 'Área',
    getValue: (row) => PreAnalyticalDataHelpers.getArea(row.area),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (row) => PreAnalyticalDataHelpers.getStatus(row.status),
    width: 16
  }
];

/**
 * Column definitions for transport view (En tránsito)
 * Used by Excel export service
 */
export const PRE_ANALYTICAL_TRANSPORT_EXPORT_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => PreAnalyticalDataHelpers.formatDate(row.date),
    width: 15
  },
  {
    header: 'Protocolo',
    getValue: (row) => PreAnalyticalDataHelpers.getProtocol(row.protocol),
    width: 15
  },
  {
    header: 'Acción Previa',
    getValue: (row) => PreAnalyticalDataHelpers.getPreviousAction(row.previousAction),
    width: 20
  },
  {
    header: 'Usuario Previo',
    getValue: (row) => PreAnalyticalDataHelpers.getPreviousUser(row.previousUser),
    width: 25
  },
  {
    header: 'Paciente',
    getValue: (row) => PreAnalyticalDataHelpers.getPatientName(row.patientName),
    width: 30
  },
  {
    header: 'Área Destino',
    getValue: (row) => PreAnalyticalDataHelpers.getArea(row.area),
    width: 20
  },
  {
    header: 'Estado',
    getValue: (row) => PreAnalyticalDataHelpers.getStatus(row.status),
    width: 18
  }
];

/**
 * PDF column definitions for transport view
 */
export const PRE_ANALYTICAL_TRANSPORT_PDF_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => PreAnalyticalDataHelpers.formatDate(row.date),
    width: 14
  },
  {
    header: 'Protocolo',
    getValue: (row) => PreAnalyticalDataHelpers.getProtocol(row.protocol),
    width: 12
  },
  {
    header: 'Acción Prev',
    getValue: (row) => PreAnalyticalDataHelpers.getPreviousAction(row.previousAction),
    width: 16
  },
  {
    header: 'Usuario Prev',
    getValue: (row) => PreAnalyticalDataHelpers.getPreviousUser(row.previousUser),
    width: 18
  },
  {
    header: 'Paciente',
    getValue: (row) => PreAnalyticalDataHelpers.getPatientName(row.patientName),
    width: 22
  },
  {
    header: 'Área Dest',
    getValue: (row) => PreAnalyticalDataHelpers.getArea(row.area),
    width: 16
  },
  {
    header: 'Estado',
    getValue: (row) => PreAnalyticalDataHelpers.getStatus(row.status),
    width: 14
  }
];
