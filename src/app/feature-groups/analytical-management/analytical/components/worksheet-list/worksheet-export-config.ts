/**
 * Worksheet export configuration
 * Defines the column structure for worksheet exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

import * as WorksheetDataHelpers from './worksheet-data-helpers.util';

/**
 * Column definitions for worksheet Excel exports
 * Used by Excel export service
 */
export const WORKSHEET_EXPORT_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Nombre',
    getValue: (row) => WorksheetDataHelpers.getTemplateName(row.name),
    width: 50
  }
];

/**
 * PDF column definitions for worksheets
 */
export const WORKSHEET_PDF_COLUMNS: ExportColumn<any>[] = [
  {
    header: 'Nombre',
    getValue: (row) => WorksheetDataHelpers.getTemplateName(row.name),
    width: 80
  }
];
