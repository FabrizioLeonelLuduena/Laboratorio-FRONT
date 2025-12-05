/**
 * Settlement export configuration
 * Defines the column structure for settlement exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';
import { SettlementTableItem } from '../../models/settlement.model';

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  'Pendiente': 'Pendiente',
  'Informada': 'Informada',
  'Facturada': 'Facturada',
  'Anulada': 'Anulada'
};

/**
 * Format currency to Argentine Peso
 */
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
}

/**
 * Column definitions for settlement Excel exports
 */
export const SETTLEMENT_EXPORT_COLUMNS: ExportColumn<SettlementTableItem>[] = [
  {
    header: 'Aseguradora',
    getValue: (settlement) => settlement.insurerName || '-',
    width: 30
  },
  {
    header: 'Sigla',
    getValue: (settlement) => settlement.insurerAcronym || '-',
    width: 15
  },
  {
    header: 'Tipo',
    getValue: (settlement) => settlement.type || '-',
    width: 15
  },
  {
    header: 'Inicio Periodo',
    getValue: (settlement) => settlement.periodStart || '-',
    width: 18
  },
  {
    header: 'Fin Periodo',
    getValue: (settlement) => settlement.periodEnd || '-',
    width: 18
  },
  {
    header: 'Prestaciones',
    getValue: (settlement) => settlement.providedServicesCount?.toString() || '0',
    width: 18
  },
  {
    header: 'Total',
    getValue: (settlement) => formatCurrency(settlement.informedAmount),
    width: 20
  },
  {
    header: 'Estado',
    getValue: (settlement) => STATUS_LABELS[settlement.status] || settlement.status || '-',
    width: 15
  },
  {
    header: 'Fecha Informado',
    getValue: (settlement) => settlement.informedDate || '-',
    width: 18
  },
  {
    header: 'Observaciones',
    getValue: (settlement) => settlement.observations || '-',
    width: 50
  }
];

/**
 * Column definitions for settlement PDF exports (abbreviated headers)
 */
export const SETTLEMENT_PDF_COLUMNS: ExportColumn<SettlementTableItem>[] = [
  {
    header: 'Aseguradora',
    getValue: (settlement) => settlement.insurerAcronym || settlement.insurerName || '-',
    width: 25
  },
  {
    header: 'Tipo',
    getValue: (settlement) => settlement.type || '-',
    width: 18
  },
  {
    header: 'Periodo',
    getValue: (settlement) => `${settlement.periodStart} - ${settlement.periodEnd}`,
    width: 40
  },
  {
    header: 'Prestaciones',
    getValue: (settlement) => settlement.providedServicesCount?.toString() || '0',
    width: 20
  },
  {
    header: 'Total',
    getValue: (settlement) => formatCurrency(settlement.informedAmount),
    width: 25
  },
  {
    header: 'Estado',
    getValue: (settlement) => STATUS_LABELS[settlement.status] || settlement.status || '-',
    width: 20
  }
];
