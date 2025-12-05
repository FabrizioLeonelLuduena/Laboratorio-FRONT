/**
 * Branch export configuration
 * Defines the column structure for branch exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';

/**
 * Branch interface for export (matching the data shown in the table)
 */
export interface BranchExportData {
  id: number;
  code: string;
  description: string;
  responsibleName: string;
  fullAddress: string;
  status: string;
}

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  Activo: 'Activo',
  INACTIVE: 'Inactivo',
  Inactivo: 'Inactivo',
  MAINTENANCE: 'Mantenimiento',
  Mantenimiento: 'Mantenimiento'
};

/**
 * Translate status to Spanish
 */
function translateStatus(status: string | undefined): string {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
}

/**
 * Column definitions for branch Excel exports
 */
export const BRANCH_EXPORT_COLUMNS: ExportColumn<BranchExportData>[] = [
  {
    header: 'Código',
    getValue: (branch) => branch.code || '-',
    width: 15
  },
  {
    header: 'Descripción',
    getValue: (branch) => branch.description || '-',
    width: 35
  },
  {
    header: 'Responsable',
    getValue: (branch) => branch.responsibleName || '-',
    width: 30
  },
  {
    header: 'Dirección Completa',
    getValue: (branch) => branch.fullAddress || '-',
    width: 50
  },
  {
    header: 'Estado',
    getValue: (branch) => translateStatus(branch.status),
    width: 18
  }
];

/**
 * Column definitions for branch PDF exports (abbreviated headers)
 */
export const BRANCH_PDF_COLUMNS: ExportColumn<BranchExportData>[] = [
  {
    header: 'Código',
    getValue: (branch) => branch.code || '-',
    width: 25
  },
  {
    header: 'Descripción',
    getValue: (branch) => branch.description || '-',
    width: 50
  },
  {
    header: 'Responsable',
    getValue: (branch) => branch.responsibleName || '-',
    width: 45
  },
  {
    header: 'Dirección',
    getValue: (branch) => branch.fullAddress || '-',
    width: 80
  },
  {
    header: 'Estado',
    getValue: (branch) => translateStatus(branch.status),
    width: 25
  }
];
