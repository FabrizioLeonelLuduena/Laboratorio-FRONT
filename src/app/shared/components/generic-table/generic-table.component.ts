import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe, LowerCasePipe,
  PercentPipe,
  TitleCasePipe,
  UpperCasePipe
} from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  signal,
  computed,
  Injector,
  PipeTransform, Type
} from '@angular/core';

import { JoyrideModule } from 'ngx-joyride';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';

import { Filter, FilterChangeEvent } from '../../models/filter.model';
import { ColumnPipeConfig, GenericColumn, PipeArgs } from '../../models/generic-table.models';
import { NbuLabelPipe } from '../../pipes/nbu-label.pipe';
import { ScalePipe } from '../../pipes/scale.pipe';
import { FilterComponent } from '../filters/filter.component';
import { GenericBadgeComponent } from '../generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericDownloadMenuComponent } from '../generic-download-menu/generic-download-menu.component';
import { GenericMenuComponent } from '../generic-menu/generic-menu.component';

/**
 * @component GenericTableComponent
 *
 * Reusable and configurable table component built on top of PrimeNG's `p-table`.
 * Designed to standardize table behavior across modules such as Coverages, Plans, or Insurers.
 *
 * Features:
 * - Fully reactive using Angular signals for local data storage.
 * - Supports both client-side (non-lazy) and server-side (lazy) pagination and filtering.
 * - Emits custom events for actions like export, filtering, pagination, and record creation.
 * - Integrates with the generic components: buttons, badges, filters, and download menus.
 *
 * @example
 * ```html
 * <app-generic-table
 *   [columns]="columns"
 *   [data]="coverages"
 *   [filters]="coverageFilters"
 *   [lazy]="true"
 *   (filterChange)="onFilterChange($event)"
 *   (downloadExcel)="onExportExcel()"
 *   (downloadPdf)="onExportPdf()"
 *   (create)="onCreateCoverage()"
 *   (pageChange)="onPageChange($event)">
 * </app-generic-table>
 * ```
 */
@Component({
  selector: 'app-generic-table',
  standalone: true,
  providers: [
    DatePipe, CurrencyPipe, DecimalPipe, PercentPipe,
    TitleCasePipe, UpperCasePipe, LowerCasePipe, ScalePipe,
    NbuLabelPipe
  ],
  imports: [
    CommonModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    FilterComponent,
    GenericButtonComponent,
    GenericBadgeComponent,
    GenericDownloadMenuComponent,
    GenericMenuComponent,
    JoyrideModule
  ],
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.css']
})
export class GenericTableComponent {
  /**
   * Table data.
   * Managed through a setter to keep internal signal state synchronized.
   */
  @Input() set data(value: any[]) {
    this.dataSignal.set(value ?? []);
  }

  /**
   * Getter for the current table data (signal).
   */
  get data() {
    return this.dataSignal();
  }

  /** Reactive local signal that stores the table data. */
  private dataSignal = signal<any[]>([]);

  /** Column definitions for table headers and fields.
   *  Supports either `field` (preferred) or legacy `key` property. */
  @Input() columns: Array<any> = [];

  /** List of filters rendered through the `FilterComponent`. */
  @Input() filters: Filter[] = [];

  /**
   * Controls whether filters are applied automatically on change or manually via button.
   * - true: filters apply automatically when changed (default)
   * - false: filters apply only when user clicks "Filtrar" button
   */
  @Input() autoApplyFilters = true;

  /** Show create button in the toolbar */
  @Input() showCreateButton = true;

  /** Show global search input in the toolbar */
  @Input() showSearch = true;

  /** Show the actions column */
  @Input() showActions = true;

  /** Show filters in the toolbar */
  @Input() showFilters = true;

  /** Show download menu (Excel/PDF) in the toolbar */
  @Input() showDownloadMenu = true;

  /** Show Excel option in download menu */
  @Input() showExcelOption = true;

  /** Show PDF option in download menu */
  @Input() showPdfOption = true;

  /** Map of custom templates for specific columns. Key is field name, value is TemplateRef. */
  @Input() columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /** Enable row expansion */
  @Input() expandable = false;

  /** Template used for expanded row content (only if `expandable` = true). */
  @Input() expandedRowTemplate: TemplateRef<any> | null = null;

  /** Function that returns available actions for a given row (buttons or menu items). */
  @Input() getActions: (row: any) => any[] = () => [];

  /** Field name representing the unique identifier for each data object (default: `'id'`). */
  @Input() dataKey = 'id';

  /**
   * Default number of rows displayed per page.
   * Can be overridden by parent component.
   */
  @Input() rows = 10;

  /**
   * Page size options displayed in the paginator dropdown.
   * Default options: 5, 10, 25.
   */
  @Input() rowsOptions = [5, 10, 25];

  /** Enables or disables the visual paginator. */
  @Input() pageable = true;

  /** Defines the paginator position: 'top' | 'bottom' | 'both'. */
  @Input() paginatorPosition: 'top' | 'bottom' | 'both' = 'bottom';

  /** Indicates whether the table is in a loading state. */
  @Input() loading = false;

  /** Enables server-side pagination (lazy loading). */
  @Input() lazy = false;

  /** Total number of records on the server (used for lazy pagination). */
  @Input() totalRecords = 0;

  /** (Optional) Joyride configuration for the 'Create' button. */
  @Input() createButtonJoyrideConfig?: { step: string; title: string; text: string; };

  /** (Optional) Joyride configuration for the 'Download' menu. */
  @Input() downloadMenuJoyrideConfig?: { step: string; title: string; text: string; };

  /** Emits when filter values change inside the `FilterComponent`. */
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();

  /** Emits when the user requests an Excel export. */
  @Output() downloadExcel = new EventEmitter<any[]>();

  /** Emits when the user requests a PDF export. */
  @Output() downloadPdf = new EventEmitter<any[]>();

  /** Emits when the user clicks the "create" button. */
  @Output() create = new EventEmitter<void>();

  /**
   * Emits pagination changes: `{ first, rows }`.
   * - `first`: index of the first displayed record (0-based)
   * - `rows`: number of rows per page
   */
  @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

  /**
   * Emits changes from the global search filter input.
   * Fired on each keystroke entered by the user.
   * Useful to implement server-side search when lazy=true.
   */
  @Output() globalFilterChange = new EventEmitter<string>();

  /**
   * Emits column sorting changes.
   * Fires when the user clicks on a sortable column.
   * Useful for implementing server-side sorting when lazy=true.
   */
  @Output() sortChange = new EventEmitter<{ field: string; order: 'asc' | 'desc' }[]>();

  expandedRowKeys: Record<string, boolean> = {};

  /** Current paginator state (first item index). */
  first = 0;

  /** Global search value signal. */
  globalFilterValue = signal('');

  /** Multi-sort meta used for client-side sorting (when !lazy). */
  multiSortMetaSignal = signal<Array<{ field: string; order: number }>>([]);

  /**
   * Computed signal for client-side filtering (active only when `lazy = false`).
   * Returns the filtered dataset based on the current global search term.
   */
  filteredData = computed(() => {
    let source = this.dataSignal();

    // Local filtering (only when not lazy)
    if (!this.lazy) {
      const term = this.globalFilterValue().toLocaleLowerCase();
      if (term) {
        source = source.filter(item =>
          Object.values(item).join(' ').toLocaleLowerCase().includes(term)
        );
      }

      // Local sorting (only when not lazy)
      const sortMeta = this.multiSortMetaSignal();
      if (sortMeta.length) {
        source = [...source].sort((a, b) => {
          for (const meta of sortMeta) {
            const field = meta.field;
            const order = meta.order;
            const av = a[field];
            const bv = b[field];
            if (av === bv) continue;
            if (av === undefined || av === null) return -1 * order;
            if (bv === undefined || bv === null) return 1 * order;
            if (av < bv) return -1 * order;
            if (av > bv) return 1 * order;
          }
          return 0;
        });
      }
    }

    return source;
  });

  /**
   * Constructor with Injector for dynamic pipe resolution.
   */
  constructor(private injector: Injector) {
  }

  /**
   * Handles selected actions from the contextual menu (⋮).
   * Executes the command function associated with the selected action.
   */
  onActionSelected(event: { action: string; row: any }): void {
    const { action, row } = event;
    const availableActions = this.getActions(row);
    const selected = availableActions.find(
      a => a.id === action || a.label === action
    );
    selected?.command?.();
  }

  /**
   * Propagates filter changes from the child `FilterComponent`
   * to the parent component.
   * @param event Filter change payload.
   */
  onFilterChange(event: FilterChangeEvent) {
    this.filterChange.emit(event);
  }

  /**
   * Updates the global search filter from the input element.
   * - If `lazy = true`, emits `globalFilterChange` for server-side search.
   * - If `lazy = false`, updates the local signal for client-side filtering.
   */
  onGlobalFilter(e: Event): void {
    const input = e.target as any;
    const value = input.value;
    this.globalFilterValue.set(value);

    if (this.lazy) {
      this.globalFilterChange.emit(value);
    }
  }

  /**
   * Toggles the expansion state of a specific row.
   * @param row Target row.
   */
  toggleRow(row: any): void {
    const key = row[this.dataKey];
    this.expandedRowKeys[key] = !this.expandedRowKeys[key];
  }

  /**
   * Marks a row as expanded.
   * @param row Target row.
   */
  onRowExpand(row: any): void {
    this.expandedRowKeys[row[this.dataKey]] = true;
  }

  /**
   * Marks a row as collapsed.
   * @param row Target row.
   */
  onRowCollapse(row: any): void {
    this.expandedRowKeys[row[this.dataKey]] = false;
  }

  /**
   * Expands a row by its index in the current data array.
   * Useful for programmatic expansion (e.g., from tutorials or automated flows).
   * @param index 0-based index of the row to expand.
   */
  expandRowByIndex(index: number): void {
    const currentData = this.lazy ? this.dataSignal() : this.filteredData();
    if (index < 0 || index >= currentData.length) return;
    const row = currentData[index];
    const key = row[this.dataKey];
    this.expandedRowKeys[key] = true;
  }

  /**
   * Handles paginator events from PrimeNG's paginator component.
   * Updates internal state and emits the `pageChange` event.
   * @param event PrimeNG paginator object: `{ first, rows, page, pageCount }`.
   */
  onPage(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.pageChange.emit({ first: this.first, rows: this.rows });
  }

  /**
   * Emits the Excel export request event with filtered data.
   */
  onExportExcel(): void {
    this.downloadExcel.emit(this.filteredData());
  }


  /**
   * Emits the PDF export request event with filtered data.
   */
  onExportPdf(): void {
    this.downloadPdf.emit(this.filteredData());
  }

  /**
   * Emits the create new record event.
   */
  onCreate(): void {
    this.create.emit();
  }

  /**
   * Handles the PrimeNG table sort event.
   * Converts PrimeNG format to the format expected by the parent component.
   * @param event sort event object: { field, order, multiSortMeta }
   */
  onSort(event: any): void {
    // PrimeNG emits event with: field, order, multiSortMeta
    if (this.lazy) {
      // Server-side sorting: emit to parent
      let sortArray: { field: string; order: 'asc' | 'desc' }[] = [];
      if (event.multiSortMeta && Array.isArray(event.multiSortMeta)) {
        sortArray = event.multiSortMeta.map((sort: any) => ({
          field: sort.field,
          order: sort.order === 1 ? 'asc' : 'desc'
        }));
      } else if (event.field) {
        sortArray = [{ field: event.field, order: event.order === 1 ? 'asc' : 'desc' }];
      }
      this.sortChange.emit(sortArray);
    } else {
      // Client-side: update local sort meta
      if (event.multiSortMeta && Array.isArray(event.multiSortMeta)) {
        this.multiSortMetaSignal.set(event.multiSortMeta.map((m: any) => ({ field: m.field, order: m.order })));
      } else if (event.field) {
        this.multiSortMetaSignal.set([{ field: event.field, order: event.order }]);
      } else {
        this.multiSortMetaSignal.set([]);
      }
    }
  }

  /**
   * Calculates the total column span for full-width rows (e.g., empty message).
   * Dynamically accounts for the presence of expansion and actions columns.
   */
  get totalColspan(): number {
    let count = this.columns.length;

    if (this.expandedRowTemplate) {
      count++;
    }
    if (this.showActions) {
      count++;
    }

    return count;
  }

  private pipeTokenMap: Record<string, Type<PipeTransform>> = {
    date: DatePipe,
    currency: CurrencyPipe,
    number: DecimalPipe,
    percent: PercentPipe,
    titlecase: TitleCasePipe,
    uppercase: UpperCasePipe,
    lowercase: LowerCasePipe,
    scale: ScalePipe
  };
  /**
   * Finds and returns the PipeTransform instance for a given pipe configuration.
   */
  private getPipeInstance(cfg: ColumnPipeConfig): PipeTransform {
    const token = 'token' in cfg
      ? cfg.token
      : this.pipeTokenMap[cfg.name];

    return this.injector.get(token);
  }

  /**
   * Resolves pipe arguments, supporting both static arrays and dynamic functions.
   */
  private resolveArgs(args: PipeArgs | undefined, row: any, value: any): any[] {
    if (!args) return [];
    return typeof args === 'function' ? args(row, value) : args;
  }

  /**
   * Applies the configured pipes to a given value for a specific column.
   */
  private applyPipes(value: any, row: any, col: GenericColumn): any {
    let v = value;
    for (const cfg of (col.pipes ?? [])) {
      const pipe = this.getPipeInstance(cfg);
      const args = this.resolveArgs(cfg.args, row, v);
      v = (pipe.transform as any)(v, ...args);
    }
    return v;
  }

  /**
   * Renders the cell value for a given row and column.
   * Applies null display and configured pipes as needed.
   */
  renderCell(row: any, col: GenericColumn): any {
    const fieldName = col.field;
    const raw = row[fieldName];
    if (raw === null || raw === undefined) {
      return col.nullDisplay ?? '—';
    }
    if (col.pipes?.length) {
      try {
        return this.applyPipes(raw, row, col);
      } catch {
        return raw;
      }
    }
    return raw;
  }
}
