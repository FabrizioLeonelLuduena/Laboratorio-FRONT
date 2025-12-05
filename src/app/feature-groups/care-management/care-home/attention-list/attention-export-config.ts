/**
 * Attention export configuration
 * Defines the column structure for attention exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';

/**
 * Attention display interface for exports
 */
export interface AttentionExportRow {
  attentionNumber: string;
  attentionStateLabel: string;
  waitingTime: string;
  admissionTime: string;
  admissionDateRaw: any;
  isUrgent: string;
}

/**
 * Helper to format admission date from raw value
 */
function formatAdmissionDate(dateRaw: any): string {
  if (!dateRaw) return '-';

  let jsDate: Date;

  // Handle array format from Java LocalDateTime [year, month, day, hour, minute, second, nano]
  if (Array.isArray(dateRaw)) {
    const [year, month, day, hour, minute, second] = dateRaw;
    // JavaScript months are 0-indexed, so subtract 1
    jsDate = new Date(year, month - 1, day, hour, minute, second || 0);
  } else {
    // Handle ISO string format or Date object
    jsDate = new Date(dateRaw);
  }

  return jsDate.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Column definitions for attention exports
 * Used by both Excel and PDF export services
 */
export const ATTENTION_EXPORT_COLUMNS: ExportColumn<AttentionExportRow>[] = [
  {
    header: 'Nro. Atención',
    getValue: (row) => row.attentionNumber || '-',
    width: 18
  },
  {
    header: 'Estado',
    getValue: (row) => row.attentionStateLabel || '-',
    width: 30
  },
  {
    header: 'Fecha/Hora Ingreso',
    getValue: (row) => formatAdmissionDate(row.admissionDateRaw),
    width: 22
  },
  {
    header: 'Tiempo de Espera',
    getValue: (row) => row.waitingTime || '-',
    width: 18
  },
  {
    header: 'Urgente',
    getValue: (row) => row.isUrgent || 'No',
    width: 12
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const ATTENTION_PDF_COLUMNS: ExportColumn<AttentionExportRow>[] = [
  {
    header: 'Nro.',
    getValue: (row) => row.attentionNumber || '-',
    width: 30
  },
  {
    header: 'Estado',
    getValue: (row) => row.attentionStateLabel || '-',
    width: 50
  },
  {
    header: 'Ingreso',
    getValue: (row) => formatAdmissionDate(row.admissionDateRaw),
    width: 40
  },
  {
    header: 'Espera',
    getValue: (row) => row.waitingTime || '-',
    width: 25
  },
  {
    header: 'Urgente',
    getValue: (row) => row.isUrgent || 'No',
    width: 25
  }
];
