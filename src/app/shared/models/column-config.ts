import { TemplateRef } from '@angular/core';

/**
 * Configuration interface for defining table columns.
 * Used to specify column properties including header text, data binding, and optional cell renderers.
 *
 * @interface ColumnConfig
 * @example
 * ```typescript
 * const columns: ColumnConfig[] = [
 *   { columnDef: 'id', header: 'ID' },
 *   { columnDef: 'name', header: 'Name' },
 *   { columnDef: 'date', header: 'Created', cellRenderer: dateTemplate }
 * ];
 * ```
 */
export interface ColumnConfig {
  /** The unique identifier for the column, used for data binding */
  columnDef: string;
  /** The display text shown in the column header */
  header: string;
  /** Optional Angular template reference for custom cell rendering */
  cellRenderer?: TemplateRef<unknown>;
}
