/**
 * Analysis export configuration
 * Defines the column structure for analysis exports using generic services
 */

import { ExportColumn } from '../../../../../../shared/services/export';
import { Analysis } from '../../../domain/analysis.model';

import * as AnalysisDataHelpers from './analysis-data-helpers.util';

/**
 * Column definitions for analysis Excel exports
 */
export const ANALYSIS_EXPORT_COLUMNS: ExportColumn<Analysis>[] = [
  {
    header: 'Código',
    getValue: (analysis) => analysis.code || '-',
    width: 15
  },
  {
    header: 'Nombre del Análisis',
    getValue: (analysis) => analysis.name || '-',
    width: 35
  },
  {
    header: 'Código Corto',
    getValue: (analysis) => analysis.shortCode || '-',
    width: 15
  },
  {
    header: 'Código NBU',
    getValue: (analysis) => AnalysisDataHelpers.getNbuCode(analysis),
    width: 15
  },
  {
    header: 'Determinación NBU',
    getValue: (analysis) => AnalysisDataHelpers.getNbuDetermination(analysis),
    width: 30
  },
  {
    header: 'Familia',
    getValue: (analysis) => AnalysisDataHelpers.getFamilyName(analysis),
    width: 25
  },
  {
    header: 'Tipo de Muestra',
    getValue: (analysis) => AnalysisDataHelpers.getSampleTypeName(analysis),
    width: 25
  },
  {
    header: 'UB',
    getValue: (analysis) => analysis.ub?.toString() || '-',
    width: 10
  },
  {
    header: 'Cantidad de Determinaciones',
    getValue: (analysis) => AnalysisDataHelpers.getDeterminationsCount(analysis),
    width: 20
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const ANALYSIS_PDF_COLUMNS: ExportColumn<Analysis>[] = [
  {
    header: 'Código',
    getValue: (analysis) => analysis.code || '-',
    width: 15
  },
  {
    header: 'Nombre',
    getValue: (analysis) => analysis.name || '-',
    width: 30
  },
  {
    header: 'Cód. Corto',
    getValue: (analysis) => analysis.shortCode || '-',
    width: 14
  },
  {
    header: 'NBU',
    getValue: (analysis) => AnalysisDataHelpers.getNbuCode(analysis),
    width: 14
  },
  {
    header: 'Familia',
    getValue: (analysis) => AnalysisDataHelpers.getFamilyName(analysis),
    width: 20
  },
  {
    header: 'Tipo Muestra',
    getValue: (analysis) => AnalysisDataHelpers.getSampleTypeName(analysis),
    width: 20
  },
  {
    header: 'UB',
    getValue: (analysis) => analysis.ub?.toString() || '-',
    width: 10
  },
  {
    header: 'Det.',
    getValue: (analysis) => AnalysisDataHelpers.getDeterminationsCount(analysis),
    width: 10
  }
];
