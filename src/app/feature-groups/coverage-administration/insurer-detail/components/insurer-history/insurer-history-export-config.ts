/**
 * History/Agreements export configuration
 * Defines the column structure for agreements history exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

/** Agreement row type for export */
type AgreementRow = {
  versionNbu?: string | number | null;
  ubValue?: number | null;
  coveragePercentage?: number | null;
  validFromDate?: string | null;
  validToDate?: string | null;
};

/**
 * Formats date to DD/MM/YYYY format
 */
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats currency value
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats percentage value (assumes value is already scaled, e.g., 2100 = 21%)
 */
function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const percentage = value * 0.01;
  return `${percentage.toFixed(0)}%`;
}

/**
 * Columns configuration for Excel export
 */
export const HISTORY_EXPORT_COLUMNS: ExportColumn<AgreementRow>[] = [
  {
    header: 'Versión NBU',
    getValue: (row) => row.versionNbu != null ? String(row.versionNbu) : '-',
    width: 18
  },
  {
    header: 'Valor UB',
    getValue: (row) => formatCurrency(row.ubValue),
    width: 18
  },
  {
    header: 'Cobertura',
    getValue: (row) => formatPercentage(row.coveragePercentage),
    width: 15
  },
  {
    header: 'Vigente desde',
    getValue: (row) => formatDate(row.validFromDate),
    width: 18
  },
  {
    header: 'Vigente hasta',
    getValue: (row) => formatDate(row.validToDate),
    width: 18
  }
];

/**
 * Columns configuration for PDF export
 */
export const HISTORY_PDF_COLUMNS: ExportColumn<AgreementRow>[] = [
  {
    header: 'Versión NBU',
    getValue: (row) => row.versionNbu != null ? String(row.versionNbu) : '-',
    width: 50
  },
  {
    header: 'Valor UB',
    getValue: (row) => formatCurrency(row.ubValue),
    width: 50
  },
  {
    header: 'Cobertura',
    getValue: (row) => formatPercentage(row.coveragePercentage),
    width: 40
  },
  {
    header: 'Vigente desde',
    getValue: (row) => formatDate(row.validFromDate),
    width: 50
  },
  {
    header: 'Vigente hasta',
    getValue: (row) => formatDate(row.validToDate),
    width: 50
  }
];
