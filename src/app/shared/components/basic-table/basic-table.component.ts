import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PrimeTemplate } from 'primeng/api';
import { TableModule } from 'primeng/table';

import { ColumnConfig } from '../../models/column-config';

/**
 * Generic reusable table component built with Angular Material.
 * Provides a flexible data table with configurable columns and custom cell renderers.
 *
 * @component
 * @selector app-basic-table
 * @example
 * ```html
 * <app-basic-table
 *   [columns]="tableColumns"
 *   [data]="tableData">
 * </app-basic-table>
 * ```
 * @example
 * ```typescript
 * // Component usage
 * export class MyComponent {
 *   tableColumns: ColumnConfig[] = [
 *     { columnDef: 'id', header: 'ID' },
 *     { columnDef: 'name', header: 'Name' }
 *   ];
 *   tableData = [
 *     { id: 1, name: 'John' },
 *     { id: 2, name: 'Jane' }
 *   ];
 * }
 * ```
 */
@Component({
  selector: 'app-basic-table',
  imports: [
    NgTemplateOutlet,
    NgIf,
    PrimeTemplate,
    NgForOf,
    TableModule
  ],
  templateUrl: './basic-table.component.html',
  styleUrls: ['./basic-table.component.css']
})
export class BasicTableComponent<T extends Record<string, unknown>> {
  /**
   * Array of column configurations that define the table structure.
   * Each column configuration specifies the column definition, header text, and optional cell renderer.
   * @type {ColumnConfig[]}
   * @default []
   */
  @Input() columns: ColumnConfig[] = [];

  /**
   * The dataset to display in the table rows.
   * Each object in the array represents a table row with properties matching the column definitions.
   * @type {T[]}
   * @default []
   */
  @Input() data: T[] = [];

  /**
   * Computed property that returns an array of column definition strings.
   * Used by Angular Material table to determine which columns to display.
   * @readonly
   * @returns {string[]} Array of column definition identifiers
   */
  get displayedColumns(): string[] {
    return this.columns.map((c) => c.columnDef);
  }
}
