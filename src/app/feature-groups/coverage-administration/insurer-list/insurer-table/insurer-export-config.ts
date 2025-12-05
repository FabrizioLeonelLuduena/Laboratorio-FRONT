/**
 * Insurer/Coverage export configuration
 * Defines the column structure for insurer exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';
import { InsurerResponseDTO } from '../../models/insurer.model';

/**
 * Insurer type label mapping (español)
 */
const INSURER_TYPE_LABELS: Record<string, string> = {
  SOCIAL: 'Obra Social',
  PREPAID: 'Prepaga',
  SELF_PAY: 'Particular',
  MUTUAL: 'Mutual',
  ART: 'ART',
  GOVERNMENT: 'Gubernamental',
  OTHER: 'Otro'
};

/**
 * Translate insurer type to Spanish
 */
function translateInsurerType(type: string | undefined): string {
  if (!type) return '-';
  return INSURER_TYPE_LABELS[type.toUpperCase()] || type;
}

/**
 * Translate status to Spanish
 */
function translateStatus(active: boolean | undefined): string {
  if (active === undefined || active === null) return '-';
  return active ? 'Activo' : 'Inactivo';
}

/**
 * Column definitions for insurer Excel exports
 */
export const INSURER_EXPORT_COLUMNS: ExportColumn<InsurerResponseDTO & { insurerTypeName?: string }>[] = [
  {
    header: 'Código',
    getValue: (insurer) => insurer.code || '-',
    width: 15
  },
  {
    header: 'Sigla',
    getValue: (insurer) => insurer.acronym || '-',
    width: 12
  },
  {
    header: 'Nombre',
    getValue: (insurer) => insurer.name || '-',
    width: 40
  },
  {
    header: 'Tipo',
    getValue: (insurer) => insurer.insurerTypeName || translateInsurerType(insurer.insurerType),
    width: 20
  },
  {
    header: 'Descripción',
    getValue: (insurer) => insurer.description || '-',
    width: 50
  },
  {
    header: 'URL de Autorización',
    getValue: (insurer) => insurer.autorizationUrl || '-',
    width: 45
  },
  {
    header: 'Estado',
    getValue: (insurer) => translateStatus(insurer.active),
    width: 15
  }
];

/**
 * Column definitions for insurer PDF exports (abbreviated headers)
 */
export const INSURER_PDF_COLUMNS: ExportColumn<InsurerResponseDTO & { insurerTypeName?: string }>[] = [
  {
    header: 'Código',
    getValue: (insurer) => insurer.code || '-',
    width: 20
  },
  {
    header: 'Sigla',
    getValue: (insurer) => insurer.acronym || '-',
    width: 18
  },
  {
    header: 'Nombre',
    getValue: (insurer) => insurer.name || '-',
    width: 60
  },
  {
    header: 'Tipo',
    getValue: (insurer) => insurer.insurerTypeName || translateInsurerType(insurer.insurerType),
    width: 30
  },
  {
    header: 'Descripción',
    getValue: (insurer) => insurer.description || '-',
    width: 65
  },
  {
    header: 'Estado',
    getValue: (insurer) => translateStatus(insurer.active),
    width: 20
  }
];
