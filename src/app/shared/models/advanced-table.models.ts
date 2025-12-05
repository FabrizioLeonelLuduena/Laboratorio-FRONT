import { TemplateRef } from '@angular/core';

/**
 * Describes a single column configuration for the generic table component.
 * Each object of this type defines how one column should be rendered
 * and optionally filtered.
 */
export interface GenericTableColumn<T = Record<string, unknown>> {
  /** Key in the data object that provides the value for this column. */
  key: keyof T & string;

  /** Visible title displayed in the table header. */
  header: string;

  /**
   * Type of content the column displays.
   *  - 'text'    : plain text.
   *  - 'number'  : numeric values.
   *  - 'image'   : an image URL.
   *  - 'actions' : buttons/icons for actions.
   *  - 'template': custom Angular template.
   */
  type?: 'text' | 'number' | 'image' | 'actions' | 'template';

  /**
   * Type of filter allowed for this column.
   *  - 'none'  : no filter.
   *  - 'text'  : text input filter.
   *  - 'select': dropdown with predefined options.
   *  - 'range' : numeric range filter.
   */
  filterType?: 'none' | 'text' | 'select' | 'range' | 'number';

  /** List of options for a 'select' filter. */
  options?: string[];

  /** Custom cell template for advanced rendering (used when type = 'template'). */
  cellTemplate?: TemplateRef<any>;

  /** List of actions available if this column is of type 'actions'. */
  actions?: GenericTableAction[];
}

/**
 * Represents a single action (button/icon) that can be shown inside an
 * 'actions' column.
 */
export interface GenericTableAction {
  /** Name of the Material icon to display. */
  icon: string;

  /** Optional text label for the action. */
  label?: string;

  /** Color theme of the action button. */
  color?: 'primary' | 'accent' | 'warn';

  /** Type of action to trigger. */
  type: 'eliminar' | 'editar' | 'ver' | 'custom';
}

/**
 * Global configuration options for the generic table component.
 */
export interface GenericTableConfig {
  /** Page-size choices for the paginator. */
  pageSizeOptions?: number[];

  /** Whether to show the global filter input. */
  showGlobalFilter?: boolean;

  /** Enable export to PDF functionality. */
  exportPdf?: boolean;

  /** Enable export to Excel functionality. */
  exportExcel?: boolean;

  /** Keep the header row fixed while scrolling. */
  stickyHeader?: boolean;
}
