/**
 * Studies export configuration
 * Defines the column structure for studies exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

import * as EstudiosDataHelpers from './estudios-data-helpers.util';

/**
 * Column definitions for studies Excel exports
 * Used by Excel export service
 */
export const ESTUDIOS_EXPORT_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => EstudiosDataHelpers.formatDate(row.formattedDate),
    width: 20
  },
  {
    header: 'Protocolo',
    getValue: (row) => EstudiosDataHelpers.getProtocolCode(row.protocolCode),
    width: 15
  },
  {
    header: 'Documento',
    getValue: (row) => EstudiosDataHelpers.getPatientDocument(row.patientDocument),
    width: 18
  },
  {
    header: 'Nombre del Paciente',
    getValue: (row) => EstudiosDataHelpers.getPatientName(row.patientName),
    width: 35
  },
  {
    header: 'Estado de Firma',
    getValue: (row) => EstudiosDataHelpers.getSignatureStatus(row.signatureStatusLabel),
    width: 20
  }
];

/**
 * PDF column definitions for studies
 */
export const ESTUDIOS_PDF_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Fecha',
    getValue: (row) => EstudiosDataHelpers.formatDate(row.formattedDate),
    width: 18
  },
  {
    header: 'Protocolo',
    getValue: (row) => EstudiosDataHelpers.getProtocolCode(row.protocolCode),
    width: 14
  },
  {
    header: 'Documento',
    getValue: (row) => EstudiosDataHelpers.getPatientDocument(row.patientDocument),
    width: 16
  },
  {
    header: 'Paciente',
    getValue: (row) => EstudiosDataHelpers.getPatientName(row.patientName),
    width: 28
  },
  {
    header: 'Estado Firma',
    getValue: (row) => EstudiosDataHelpers.getSignatureStatus(row.signatureStatusLabel),
    width: 18
  }
];
