/**
 * Generic export models and interfaces
 * Provides type-safe configuration for Excel and PDF exports
 */

/**
 * Column configuration for exports
 * Defines how each column should be rendered in the exported file
 */
export interface ExportColumn<T = any> {
  /** Column header text */
  header: string;
  /** Function to extract/format the value from a row */
  getValue: (row: T) => string | number | null | undefined;
  /** Column width (characters for Excel, mm for PDF) */
  width?: number;
}

/**
 * Excel-specific styling configuration
 */
export interface ExcelHeaderStyle {
  /** Background color in RGB hex format (e.g., 'FF008C8A') */
  backgroundColor?: string;
  /** Text color in RGB hex format (e.g., 'FFFFFFFF') */
  textColor?: string;
  /** Whether text should be bold */
  bold?: boolean;
  /** Horizontal alignment */
  horizontalAlign?: 'left' | 'center' | 'right';
  /** Vertical alignment */
  verticalAlign?: 'top' | 'center' | 'bottom';
}

/**
 * PDF-specific styling configuration
 */
export interface PdfHeaderStyle {
  /** Background color as RGB array [r, g, b] (0-255) */
  backgroundColor?: [number, number, number];
  /** Text color as RGB array [r, g, b] (0-255) */
  textColor?: [number, number, number];
  /** Font size in points */
  fontSize?: number;
  /** Whether text should be bold */
  bold?: boolean;
  /** Horizontal alignment */
  horizontalAlign?: 'left' | 'center' | 'right';
}

/**
 * PDF body styling configuration
 */
export interface PdfBodyStyle {
  /** Font size in points */
  fontSize?: number;
  /** Cell padding in mm */
  cellPadding?: number;
  /** Horizontal alignment */
  horizontalAlign?: 'left' | 'center' | 'right';
  /** Alternate row background color as RGB array */
  alternateRowColor?: [number, number, number];
}

/**
 * PDF logo configuration
 */
export interface PdfLogoConfig {
  /** Path to logo image (relative to public folder) */
  path: string;
  /** Logo width in mm */
  width?: number;
  /** Logo height in mm */
  height?: number;
  /** X position in mm */
  x?: number;
  /** Y position in mm */
  y?: number;
}

/**
 * Configuration for Excel export
 */
export interface ExcelExportConfig<T = any> {
  /** Data rows to export */
  data: T[];
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** Name of the worksheet */
  sheetName?: string;
  /** Base filename (without extension) */
  fileName?: string;
  /** Whether to include timestamp in filename */
  includeTimestamp?: boolean;
  /** Header styling */
  headerStyle?: ExcelHeaderStyle;
}

/**
 * Configuration for PDF export
 */
export interface PdfExportConfig<T = any> {
  /** Data rows to export */
  data: T[];
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** Document title */
  title?: string;
  /** Base filename (without extension) */
  fileName?: string;
  /** Whether to include timestamp in filename */
  includeTimestamp?: boolean;
  /** Whether to include date in document */
  includeDate?: boolean;
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Header styling */
  headerStyle?: PdfHeaderStyle;
  /** Body styling */
  bodyStyle?: PdfBodyStyle;
  /** Logo configuration */
  logo?: PdfLogoConfig;
  /** Left margin in mm */
  marginLeft?: number;
  /** Right margin in mm */
  marginRight?: number;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
  /** Generated filename */
  fileName?: string;
}
