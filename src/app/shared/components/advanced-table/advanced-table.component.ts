import { CommonModule } from '@angular/common';
import { Component, input, output, TemplateRef, viewChild, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Popover } from 'primeng/popover';
import { Ripple } from 'primeng/ripple';
import { Skeleton } from 'primeng/skeleton';
import { TableModule, Table, TableLazyLoadEvent } from 'primeng/table';
import { Subject } from 'rxjs';

import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { GenericTableColumn } from '../../models/advanced-table.models';
import { Filter, FilterChangeEvent } from '../../models/filter.model';
import { FilterComponent } from '../filters/filter.component';
import { GenericButtonComponent } from '../generic-button/generic-button.component';

/**
 * Reusable advanced table based on PrimeNG.
 */
@Component({
  selector: 'app-advanced-table',
  standalone: true,
  templateUrl: './advanced-table.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ButtonDirective,
    InputText,
    Popover,
    Ripple,
    Skeleton,
    TableModule,
    GenericButtonComponent,
    FilterComponent
    // Generic button for highlighted actions (not currently used)
  ],
  styleUrls: ['./advanced-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedTableComponent implements OnDestroy {
  dt = viewChild<Table>('dt');
  popover = viewChild<Popover>('op');
  /** Filter popover */
  filterPopover = viewChild<Popover>('fp');
  /** Export popover */
  exportPopover = viewChild<Popover>('xp');

  /** Unique key per row. Defaults to 'id'. */
  dataKey = input<string>('id');

  /** Table data */
  data = input<Record<string, any>[]>([]);

  /** Available columns (accepts shared model columns or normalized) */
  columns = input<Array<GenericTableColumn | GenericColumn | { field: string; header: string; template?: TemplateRef<any> }>>([]);

  /** Normalized columns for the template (field/header/template) */
  get normalizedColumns(): Array<{ field: string; header: string; template?: TemplateRef<any> }> {
    return (this.columns() ?? []).map((c) => {
      if (c && typeof c === 'object') {
        // Shared model: key, header, cellTemplate
        if ('key' in c) {
          return { field: c.key as string, header: c.header, template: c.cellTemplate };
        }
        // Already normalized internal form
        if ('field' in c) {
          return { field: c.field, header: c.header, template: c.template };
        }
      }
      return c as any; // Fallback for unexpected formats. Consider logging a warning.
    });
  }

  /** Default and merged table configuration */
  private readonly defaultConfig: AdvancedTableConfig = {
    showGlobalFilter: false,
    showActions: false,
    expandable: false,
    /** Master switch paginator (compat) */
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    /** Show export button (compat) */
    exportCsv: false,
    reorderableColumns: true,
    scrollable: false,
    scrollHeight: 'flex',
    stickyFirstColumn: false,
    lazy: false,
    // New: show add button in toolbar
    showAddButton: false,
    // New: optional filter button (hidden by default)
    showFilterButton: false,
    // NEW: independent pagination switches
    showPaginationControls: true,
    showRowsPerPageSelector: true
  };
  /** Table configuration */
  config = input(this.defaultConfig, {
    transform: (value: AdvancedTableConfig | undefined) => ({ ...this.defaultConfig, ...(value ?? {}) })
  });

  /** Loading state and lazy loading */
  loading = input<boolean>(false);
  totalRecords = input<number>(0);
  lazyLoad = output<TableLazyLoadEvent>();

  /** Available actions */
  actionItems = input<TableAction[]>([]);

  /** Function to get actions dynamically per row */
  getRowActions = input<((row: Record<string, any>) => TableAction[]) | undefined>();
  /** NEW: key of row type (default 'type' if not specified) */
  rowTypeKey = input<string | undefined>(undefined);
  /** NEW: mapping of actions per row type (optional) */
  rowTypeActions = input<Record<string, TableAction[]>>({});

  /** Expanded row template (optional) */
  expandedTemplate = input<TemplateRef<any> | undefined>();

  /** Empty state message (i18n) */
  emptyMessage = input<string>('No se encontraron registros.');

  /** Emits when an action is invoked on a row */
  action = output<{ type: string; row: Record<string, any> }>();

  /** New: emits when the '+' button is clicked */
  addClicked = output<void>();

  /** New: filter panel content template (optional, configurable by parent) */
  filterTemplate = input<TemplateRef<any> | undefined>();
  /** New: filter panel events (apply, clear, change, etc.) */
  filterAction = output<{ type: string; payload?: any }>();
  /** New: filter panel open/close events */
  filterOpen = output<void>();
  filterClose = output<void>();

  /** NEW: optional toolbar title */
  toolbarTitle = input<string | undefined>();

  /** NEW: active filter indicators */
  filtersActive = input<boolean>(false);
  filtersCount = input<number | undefined>(undefined);

  /** NEW: filters array for integrated filter component */
  filters = input<Filter[]>([]);
  /** NEW: emits when an integrated filter changes */
  filterChange = output<FilterChangeEvent>();

  /** NEW: customizable export panel and events */
  exportTemplate = input<TemplateRef<any> | undefined>();
  exportAction = output<{ type: 'excel' | 'pdf' }>();

  /** Local state */
  searchValue = '';
  expandedRows: { [key: string]: boolean } = {};

  /** Active row for actions menu */
  activeRow?: Record<string, any>;

  /** Debounced global filter input */
  private filterInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  /**
   * Sets up the debounced global filter stream and wires it to PrimeNG table filtering.
   * The filterInput$ emits search terms which are debounced (300ms) and applied
   * to the table's global filter; it also clears filters when the input is empty.
   * Cleanup is handled in ngOnDestroy via destroy$ to prevent memory leaks.
   */
  constructor() {
    this.filterInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        const dt = this.dt();
        if (!dt) return;
        if (term.length >= 3) {
          dt.filterGlobal(term, 'contains');
        } else {
          dt.clear();
        }
      });
  }

  /** Fields to consider for global filter */
  get globalFields(): string[] {
    return (this.normalizedColumns ?? []).map((c) => c.field);
  }

  /** Centralized colspan calculation for special rows */
  get colSpanTotal(): number {
    const base = this.normalizedColumns.length;
    const actions = this.config().showActions ? 1 : 0;
    const expand = this.config().expandable ? 1 : 0;
    return base + actions + expand;
  }

  /** Generate skeleton placeholder data for loading state */
  get skeletonRows(): Record<string, any>[] {
    const count = 3;
    return Array.from({ length: count }, (_, i) => ({
      [this.dataKey()]: `skeleton-${i}`,
      __isSkeleton: true
    }));
  }

  /** Returns skeleton data when loading, otherwise real data */
  get tableData(): Record<string, any>[] {
    return this.loading() ? this.skeletonRows : this.data();
  }

  /** Check if a row is a skeleton placeholder */
  isSkeleton(row: Record<string, any>): boolean {
    return row?.['__isSkeleton'] === true;
  }

  /** Get actions for the active row */
  get currentRowActions(): TableAction[] {
    const row = this.activeRow;
    const getRowActionsFn = this.getRowActions();
    if (getRowActionsFn && row) {
      return this.filterVisible(getRowActionsFn(row), row);
    }
    // Fallback to type mapping if configured
    if (row) {
      const key = this.rowTypeKey() || 'type';
      const typeVal = row?.[key];
      const map = this.rowTypeActions();
      const fromMap = (typeVal != null && map[typeVal as string]) ? map[typeVal as string] : (map['default'] ?? []);
      if (fromMap.length > 0) {
        return this.filterVisible(fromMap, row);
      }
    }
    // Default
    return this.filterVisible(this.actionItems(), row);
  }

  /** Filter non-visible actions according to 'visible' */
  private filterVisible(actions: TableAction[], row?: Record<string, any>): TableAction[] {
    return (actions ?? []).filter((a) => this.isActionVisible(a, row));
  }

  /** Determines if an action is visible */
  isActionVisible(action: TableAction, row?: Record<string, any>): boolean {
    const v = action.visible;
    if (typeof v === 'function') return v(row ?? this.activeRow ?? {});
    if (typeof v === 'boolean') return v;
    return true;
  }

  /** Determines if an action is disabled */
  isActionDisabled(action: TableAction, row?: Record<string, any>): boolean {
    const d = action.disabled;
    if (typeof d === 'function') return d(row ?? this.activeRow ?? {});
    if (typeof d === 'boolean') return d;
    return false;
  }

  /** Applies global filter with a minimum of 3 characters; clears if empty */
  onGlobalFilter(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value ?? '';
    this.filterInput$.next(this.searchValue);
  }

  /** Clears filters and search */
  clearFilters(): void {
    this.searchValue = '';
    this.dt()?.clear();
  }

  /** New: handler for '+' button */
  onAddClick(): void {
    this.addClicked.emit();
  }

  /** New: open/close filter panel */
  openFilterPanel(event: Event): void {
    // eslint-disable-next-line no-console
    console.log('[AdvancedTable] openFilterPanel click', { event });
    this.filterPopover()?.toggle(event);
  }

  /** Handles filter change event */
  onFilterChange(filterEvent: FilterChangeEvent): void {
    this.filterChange.emit(filterEvent);
  }

  /** Emits event when filter panel is shown */
  onFilterShow(): void {
    // eslint-disable-next-line no-console
    console.log('[AdvancedTable] filter popover shown');
    this.filterOpen.emit();
  }
  /** Emits event when filter panel is hidden */
  onFilterHide(): void {
    // eslint-disable-next-line no-console
    console.log('[AdvancedTable] filter popover hidden');
    this.filterClose.emit();
  }
  /** Closes the filter panel (can be called from external template) */
  closeFilterPanel(): void { this.filterPopover()?.hide(); }

  /** API exposed to filter templates to emit actions and close panel */
  get filterApi() {
    return {
      emit: (type: string, payload?: any) => this.emitFilterAction(type, payload),
      close: () => this.closeFilterPanel()
    };
  }

  /** New: utility to emit actions from filter panel content */
  emitFilterAction(type: string, payload?: any): void {
    this.filterAction.emit({ type, payload });
  }

  /** NEW: open/close export panel */
  openExportPanel(event: Event): void {
    this.exportPopover()?.toggle(event);
  }
  /** Closes export panel */
  closeExportPanel(): void {
    this.exportPopover()?.hide();
  }

  /** API for export in custom templates */
  get exportApi() {
    return {
      emit: (type: 'excel' | 'pdf') => this.emitExportAction(type),
      close: () => this.closeExportPanel()
    } as const;
  }

  /** Emits export action with selected type */
  emitExportAction(type: 'excel' | 'pdf'): void {
    this.exportAction.emit({ type });
  }

  /**
   * Emits the selected action with the associated row.
   * @param type Type of triggered action.
   * @param row Row associated with the action.
   */
  onAction(type: string, row: Record<string, any>): void {
    this.action.emit({ type, row });
  }

  /** Opens the actions menu for a specific row */
  openActionsMenu(event: Event, row: Record<string, any>): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeRow = row;
    this.popover()?.toggle(event);
  }

  /** Executes an action on the active row */
  executeAction(type: string): void {
    if (!this.activeRow) return;
    this.onAction(type, this.activeRow);
    this.popover()?.hide();
  }

  /** Expansion hooks (reserved for future needs) */
  onRowExpand(_event: { data: Record<string, any> }): void {
    const row = _event?.data;
    const key = row?.[this.dataKey()];
    if (key !== undefined && key !== null) {
      this.expandedRows = { ...this.expandedRows, [key]: true };
    }
  }
  /** Hook when collapsing an expanded row */
  onRowCollapse(_event: { data: Record<string, any> }): void {
    const row = _event?.data;
    const key = row?.[this.dataKey()];
    if (key !== undefined && key !== null) {
      const { [key]: _removed, ...rest } = this.expandedRows;
      this.expandedRows = rest;
    }
  }

  /**
   * Public API to reset internal table state (filters, paginator, sorts, etc.).
   * Useful for parent components to trigger a manual refresh or clear state.
   */
  reload(): void {
    this.dt()?.reset();
  }

  /**
   * Lifecycle cleanup: completes internal Subjects to avoid memory leaks
   * (debounced filter stream) when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

/**
 * @deprecated Use GenericTableColumn (shared/models) or normalized form { field, header, template }.
 * Kept for compatibility with existing components.
 */
export interface GenericColumn {
  field: string;
  header: string;
  /** Optional custom cell template */
  template?: TemplateRef<any>;
  /** Optional alignment for the column content (used by consumers) */
  align?: 'left' | 'center' | 'right' | string;
}

/** Table behavior configuration */
export interface AdvancedTableConfig {
  showGlobalFilter?: boolean;
  /** Deprecated: column selector removed */
  showColumnSelector?: boolean;
  showActions?: boolean;
  expandable?: boolean;
  /** Master switch paginator (compatibility) */
  paginator?: boolean;
  rows?: number;
  exportCsv?: boolean;
  /** New: show add button in toolbar */
  showAddButton?: boolean;
  /** New: show filter button in toolbar */
  showFilterButton?: boolean;
  /** Configurable page sizes */
  rowsPerPageOptions?: number[];
  /** Reorder columns by drag&drop (true by default) */
  reorderableColumns?: boolean;
  /** Scrollable + scroll height for sticky header */
  scrollable?: boolean;
  scrollHeight?: string;
  /** First column sticky via CSS class */
  stickyFirstColumn?: boolean;
  /** Lazy loading from backend */
  lazy?: boolean;
  /** NEW: independent pagination controls */
  showPaginationControls?: boolean;
  showRowsPerPageSelector?: boolean;
}

/** Context menu action definition per row */
export interface TableAction {
  type: string;
  label: string;
  icon?: string;
  /** NEW: control visibility per action */
  visible?: boolean | ((row: Record<string, any>) => boolean);
  /** NEW: control disabled per action */
  disabled?: boolean | ((row: Record<string, any>) => boolean);
}
