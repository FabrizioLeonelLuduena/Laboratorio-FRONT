/**
 * Plans export configuration
 * Defines the column structure for plans and agreements exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

/** Plan row type for export */
type PlanRow = {
  id: number;
  code?: string | null;
  name?: string | null;
  acronym?: string | null;
  isActive: boolean;
  iva: number | null;
  validFromDate?: string | null;
  versionNbu?: string | number | null;
  ubValue?: number | null;
  coveragePercentage?: number | null;
  is_active?: boolean;
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
 * Formats status
 */
function formatStatus(active: boolean | undefined): string {
  return active ? 'Activo' : 'Inactivo';
}

/**
 * Columns configuration for Excel export
 */
export const PLANS_EXPORT_COLUMNS: ExportColumn<PlanRow>[] = [
  {
    header: 'Código',
    getValue: (row) => row.code || '-',
    width: 15
  },
  {
    header: 'Nombre',
    getValue: (row) => row.name || '-',
    width: 40
  },
  {
    header: 'Sigla',
    getValue: (row) => row.acronym || '-',
    width: 15
  },
  {
    header: 'Vigente desde',
    getValue: (row) => formatDate(row.validFromDate),
    width: 18
  },
  {
    header: 'Versión NBU',
    getValue: (row) => row.versionNbu != null ? String(row.versionNbu) : '-',
    width: 18
  },
  {
    header: 'Valor U.B.',
    getValue: (row) => formatCurrency(row.ubValue),
    width: 18
  },
  {
    header: 'Cobertura (%)',
    getValue: (row) => formatPercentage(row.coveragePercentage),
    width: 18
  },
  {
    header: 'IVA (%)',
    getValue: (row) => formatPercentage(row.iva),
    width: 15
  },
  {
    header: 'Estado',
    getValue: (row) => formatStatus(row.is_active),
    width: 15
  }
];

/**
 * Columns configuration for PDF export
 */
export const PLANS_PDF_COLUMNS: ExportColumn<PlanRow>[] = [
  {
    header: 'Código',
    getValue: (row) => row.code || '-',
    width: 15
  },
  {
    header: 'Nombre',
    getValue: (row) => row.name || '-',
    width: 40
  },
  {
    header: 'Sigla',
    getValue: (row) => row.acronym || '-',
    width: 15
  },
  {
    header: 'Vigente desde',
    getValue: (row) => formatDate(row.validFromDate),
    width: 18
  },
  {
    header: 'Valor U.B.',
    getValue: (row) => formatCurrency(row.ubValue),
    width: 18
  },
  {
    header: 'Cobertura',
    getValue: (row) => formatPercentage(row.coveragePercentage),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (row) => formatStatus(row.is_active),
    width: 15
  }
];
