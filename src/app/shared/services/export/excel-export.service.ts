/**
 * Generic Excel Export Service
 * Provides reusable functionality for exporting data to Excel files
 */

import { Injectable } from '@angular/core';

import * as XLSX from 'xlsx-js-style';

import {
  ExcelExportConfig,
  ExcelHeaderStyle,
  ExportResult
} from './export.models';

/**
 * Default Excel header styling matching brand colors
 */
const DEFAULT_HEADER_STYLE: Required<ExcelHeaderStyle> = {
  backgroundColor: 'FF008C8A', // Brand primary color
  textColor: 'FFFFFFFF',       // White
  bold: true,
  horizontalAlign: 'center',
  verticalAlign: 'center'
};

/**
 * Service for exporting data to Excel format
 * Uses xlsx-js-style library for enhanced styling capabilities
 */
@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  /**
   * Export data to Excel file with custom configuration
   * @param config Export configuration including data, columns, and styling
   * @returns Promise with export result
   */
  async exportToExcel<T>(config: ExcelExportConfig<T>): Promise<ExportResult> {
    try {
      // Prepare data for export
      const dataToExport = config.data.map(row => {
        const exportRow: Record<string, any> = {};
        config.columns.forEach(col => {
          const value = col.getValue(row);
          exportRow[col.header] = value ?? '-';
        });
        return exportRow;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Set column widths
      if (config.columns.some(col => col.width)) {
        ws['!cols'] = config.columns.map(col => ({
          wch: col.width || 15
        }));
      }

      // Apply header styling
      const headerStyle = { ...DEFAULT_HEADER_STYLE, ...config.headerStyle };
      this.applyHeaderStyles(ws, config.columns.length, headerStyle);

      // Create workbook
      const wb = XLSX.utils.book_new();
      const sheetName = config.sheetName || 'Hoja1';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename
      const fileName = this.generateFileName(
        config.fileName || 'export',
        config.includeTimestamp !== false,
        'xlsx'
      );

      // Write file
      XLSX.writeFile(wb, fileName, { cellStyles: true });

      return {
        success: true,
        fileName
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error log for Excel export failure
      console.error('Error al exportar Excel:', error);
      return {
        success: false,
        error: `No se pudo generar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Apply styling to header row
   * @param ws Worksheet object
   * @param columnCount Number of columns
   * @param style Header style configuration
   */
  private applyHeaderStyles(
    ws: any,
    columnCount: number,
    style: Required<ExcelHeaderStyle>
  ): void {
    const columnLetters = this.getColumnLetters(columnCount);
    const headerCells = columnLetters.map(letter => `${letter}1`);

    headerCells.forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: style.backgroundColor }
          },
          font: {
            color: { rgb: style.textColor },
            bold: style.bold
          },
          alignment: {
            horizontal: style.horizontalAlign,
            vertical: style.verticalAlign
          }
        };
      }
    });
  }

  /**
   * Generate column letters (A, B, C, ..., Z, AA, AB, ...)
   * @param count Number of columns
   * @returns Array of column letters
   */
  private getColumnLetters(count: number): string[] {
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      let letter = '';
      let num = i;
      while (num >= 0) {
        letter = String.fromCharCode(65 + (num % 26)) + letter;
        num = Math.floor(num / 26) - 1;
      }
      letters.push(letter);
    }
    return letters;
  }

  /**
   * Generate filename with optional timestamp
   * @param baseName Base filename without extension
   * @param includeTimestamp Whether to include timestamp
   * @param extension File extension
   * @returns Complete filename
   */
  private generateFileName(
    baseName: string,
    includeTimestamp: boolean,
    extension: string
  ): string {
    if (!includeTimestamp) {
      return `${baseName}.${extension}`;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${baseName}_${day}-${month}-${year}.${extension}`;
  }
}
