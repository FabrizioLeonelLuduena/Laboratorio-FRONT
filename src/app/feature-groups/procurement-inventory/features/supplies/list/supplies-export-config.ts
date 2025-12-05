/**
 * Supplies export configuration
 * Defines the column structure for supply exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

/**
 * Supply display row type (adjust based on actual ResponseSupplyDTO structure)
 */
export type SupplyDisplayRow = {
  id: number;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  minimumStock?: number;
  currentStock?: number;
  isActive: boolean;
  [key: string]: any;
};

/**
 * Column definitions for supply Excel exports
 */
export const SUPPLY_EXPORT_COLUMNS: ExportColumn<SupplyDisplayRow>[] = [
  {
    header: 'Nombre',
    getValue: (supply) => supply.name || '-',
    width: 35
  },
  {
    header: 'Descripción',
    getValue: (supply) => supply.description || '-',
    width: 50
  },
  {
    header: 'Categoría',
    getValue: (supply) => supply.category || '-',
    width: 20
  },
  {
    header: 'Unidad de Medida',
    getValue: (supply) => supply.unitOfMeasure || '-',
    width: 20
  },
  {
    header: 'Stock Mínimo',
    getValue: (supply) => supply.minimumStock?.toString() || '0',
    width: 15
  },
  {
    header: 'Stock Actual',
    getValue: (supply) => supply.currentStock?.toString() || '0',
    width: 15
  },
  {
    header: 'Estado',
    getValue: (supply) => supply.isActive ? 'Activo' : 'Inactivo',
    width: 12
  }
];

/**
 * Column definitions for supply PDF exports (abbreviated headers)
 */
export const SUPPLY_PDF_COLUMNS: ExportColumn<SupplyDisplayRow>[] = [
  {
    header: 'Nombre',
    getValue: (supply) => supply.name || '-',
    width: 40
  },
  {
    header: 'Categoría',
    getValue: (supply) => supply.category || '-',
    width: 25
  },
  {
    header: 'Unidad',
    getValue: (supply) => supply.unitOfMeasure || '-',
    width: 20
  },
  {
    header: 'Stock Mín.',
    getValue: (supply) => supply.minimumStock?.toString() || '0',
    width: 18
  },
  {
    header: 'Stock Actual',
    getValue: (supply) => supply.currentStock?.toString() || '0',
    width: 18
  },
  {
    header: 'Estado',
    getValue: (supply) => supply.isActive ? 'Activo' : 'Inactivo',
    width: 18
  }
];
