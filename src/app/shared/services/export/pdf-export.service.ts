/**
 * Generic PDF Export Service
 * Provides reusable functionality for exporting data to PDF files
 */

import { Injectable } from '@angular/core';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  ExportResult,
  PdfBodyStyle,
  PdfExportConfig,
  PdfHeaderStyle,
  PdfLogoConfig
} from './export.models';

/**
 * Default PDF header styling matching brand colors
 */
const DEFAULT_HEADER_STYLE: Required<PdfHeaderStyle> = {
  backgroundColor: [0, 140, 138], // Brand primary color RGB
  textColor: [255, 255, 255],     // White
  fontSize: 7,
  bold: true,
  horizontalAlign: 'center'
};

/**
 * Default PDF body styling
 */
const DEFAULT_BODY_STYLE: Required<PdfBodyStyle> = {
  fontSize: 6,
  cellPadding: 1.5,
  horizontalAlign: 'center',
  alternateRowColor: [245, 245, 245]
};

/**
 * Service for exporting data to PDF format
 * Uses jsPDF and jsPDF-AutoTable libraries
 */
@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  /**
   * Export data to PDF file with custom configuration
   * @param config Export configuration including data, columns, and styling
   * @returns Promise with export result
   */
  async exportToPdf<T>(config: PdfExportConfig<T>): Promise<ExportResult> {
    try {
      const orientation = config.orientation || 'landscape';
      const doc = new jsPDF(orientation);

      // Add title if provided
      let currentY = 15;
      if (config.title) {
        doc.setFontSize(16);
        doc.text(config.title, 14, currentY);
        currentY += 7;
      }

      // Add logo if provided
      if (config.logo) {
        try {
          const logoBase64 = await this.loadImageAsBase64(config.logo.path);
          const logoConfig = this.getLogoConfig(config.logo, orientation);
          doc.addImage(
            logoBase64,
            'PNG',
            logoConfig.x,
            logoConfig.y,
            logoConfig.width,
            logoConfig.height
          );
        } catch {
          // Continue without logo
        }
      }

      // Add date if requested
      if (config.includeDate !== false) {
        doc.setFontSize(10);
        doc.text(
          `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
          14,
          currentY
        );
        currentY += 6;
      }

      // Prepare table data
      const headers = config.columns.map(col => col.header);
      const tableData = config.data.map(row =>
        config.columns.map(col => {
          const value = col.getValue(row);
          return value ?? '-';
        })
      );

      // Merge styles
      const headerStyle = { ...DEFAULT_HEADER_STYLE, ...config.headerStyle };
      const bodyStyle = { ...DEFAULT_BODY_STYLE, ...config.bodyStyle };
      const marginLeft = config.marginLeft ?? 7;
      const marginRight = config.marginRight ?? 7;

      // Generate table using autoTable
      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: tableData,
        margin: { left: marginLeft, right: marginRight },
        styles: {
          fontSize: bodyStyle.fontSize,
          cellPadding: bodyStyle.cellPadding,
          halign: bodyStyle.horizontalAlign
        },
        headStyles: {
          fillColor: headerStyle.backgroundColor,
          textColor: headerStyle.textColor,
          fontStyle: headerStyle.bold ? 'bold' : 'normal',
          fontSize: headerStyle.fontSize,
          halign: headerStyle.horizontalAlign
        },
        alternateRowStyles: {
          fillColor: bodyStyle.alternateRowColor
        },
        columnStyles: this.generateColumnStyles(config.columns)
      });

      // Generate filename
      const fileName = this.generateFileName(
        config.fileName || 'export',
        config.includeTimestamp !== false,
        'pdf'
      );

      // Save file
      doc.save(fileName);

      return {
        success: true,
        fileName
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error log for PDF export failure
      console.error('Error al exportar PDF:', error);
      return {
        success: false,
        error: `No se pudo generar el archivo PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Load image from URL and convert to base64
   * @param url Image URL to load
   * @returns Promise with base64 data URL
   */
  private async loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = url;
    });
  }

  /**
   * Get logo configuration with defaults
   * @param logo User-provided logo config
   * @param orientation Page orientation
   * @returns Complete logo configuration
   */
  private getLogoConfig(
    logo: PdfLogoConfig,
    orientation: 'portrait' | 'landscape'
  ): Required<PdfLogoConfig> {
    const defaultX = orientation === 'landscape' ? 230 : 150;
    return {
      path: logo.path,
      width: logo.width ?? 48,
      height: logo.height ?? 14.4,
      x: logo.x ?? defaultX,
      y: logo.y ?? 8
    };
  }

  /**
   * Generate column styles based on column widths
   * @param columns Column definitions
   * @returns Column styles object for autoTable
   */
  private generateColumnStyles(
    columns: Array<{ width?: number }>
  ): Record<number, { cellWidth?: number }> {
    const styles: Record<number, { cellWidth?: number }> = {};
    columns.forEach((col, index) => {
      if (col.width) {
        styles[index] = { cellWidth: col.width };
      }
    });
    return styles;
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
