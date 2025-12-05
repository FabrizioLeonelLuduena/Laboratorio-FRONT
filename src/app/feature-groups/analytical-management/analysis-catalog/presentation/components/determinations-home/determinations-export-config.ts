/**
 * Determinations export configuration
 */

import { ExportColumn } from '../../../../../../shared/services/export';
import { Determination } from '../../../domain/determination.model';

/**
 * Interface to extend Determination with analysis information
 */
// Usar Determination directamente sin información de análisis

/**
 * Formats handling time for export
 */
function formatHandlingTime(handlingTime: any): string {
  if (!handlingTime || !handlingTime.timeValue) return '-';
  const timeUnit = handlingTime.timeUnit || 'SECONDS';
  const value = handlingTime.timeValue;
  
  switch (timeUnit) {
  case 'SECONDS':
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  case 'MINUTES':
    return `${value} min`;
  case 'HOURS':
    return `${value} h`;
  case 'DAYS':
    return `${value} días`;
  default:
    return `${value} ${timeUnit.toLowerCase()}`;
  }
}

/**
 * Gets measurement unit name for export
 */
function getMeasurementUnit(det: Determination): string {
  return det.analyticalPhaseSetting?.analyticalMethod?.measurementUnit?.name 
    || det.analyticalPhaseSetting?.analyticalMethod?.measurementUnit?.symbol 
    || '-';
}

export const DETERMINATION_EXPORT_COLUMNS: ExportColumn<Determination>[] = [
  {
    header: 'Nombre de la Determinación',
    getValue: (det) => det.name || '-',
    width: 40
  },
  {
    header: 'Unidad de Medida',
    getValue: (det) => getMeasurementUnit(det),
    width: 20
  },
  {
    header: 'Tiempo de Manejo',
    getValue: (det) => formatHandlingTime(det.handlingTime),
    width: 20
  },
  {
    header: 'Variación Tolerada (%)',
    getValue: (det) => det.percentageVariationTolerated?.toString() || '-',
    width: 20
  },
  {
    header: 'Tipo Analítico',
    getValue: (det) => det.analyticalPhaseSetting?.analyticalMethod?.analyticalType || '-',
    width: 20
  }
];

export const DETERMINATION_PDF_COLUMNS: ExportColumn<Determination>[] = [
  {
    header: 'Determinación',
    getValue: (det) => det.name || '-',
    width: 35
  },
  {
    header: 'Unidad',
    getValue: (det) => getMeasurementUnit(det),
    width: 18
  },
  {
    header: 'T. Manejo',
    getValue: (det) => formatHandlingTime(det.handlingTime),
    width: 16
  },
  {
    header: 'Var. Tol. (%)',
    getValue: (det) => det.percentageVariationTolerated?.toString() || '-',
    width: 16
  },
  {
    header: 'Tipo',
    getValue: (det) => det.analyticalPhaseSetting?.analyticalMethod?.analyticalType || '-',
    width: 15
  }
];
