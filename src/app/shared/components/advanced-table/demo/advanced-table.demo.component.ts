import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AdvancedTableComponent, AdvancedTableConfig, GenericColumn, TableAction } from '../advanced-table.component';

/**
 * Standalone demo of AdvancedTable with mock data, filters, and actions.
 */
@Component({
  selector: 'app-advanced-table-demo',
  standalone: true,
  templateUrl: './advanced-table.demo.component.html',
  imports: [
    CommonModule,
    FormsModule,
    Card,
    AdvancedTableComponent,
    ButtonDirective,
    InputText,
    SelectModule
  ]
})
export class AdvancedTableDemoComponent {
  /** Title of the demo toolbar */
  tableTitle = 'Coberturas (Demo Completa)';

  /** Complete dataset (mock) for applying local filters */
  private readonly allRows: Array<any> = [
    { id: 1, nombre: 'Plan Básico', aseguradora: 'VidaPlus', tipo: 'plan', estado: 'activo', prima: 12000, actualizado: '2025-05-01' },
    { id: 2, nombre: 'Plan Premium', aseguradora: 'SaludAR', tipo: 'plan', estado: 'inactivo', prima: 31000, actualizado: '2025-04-12' },
    { id: 3, nombre: 'OSDE 310', aseguradora: 'OSDE', tipo: 'aseguradora', estado: 'activo', prima: 45000, actualizado: '2025-03-20' },
    { id: 4, nombre: 'Swiss Medical SMG30', aseguradora: 'Swiss Medical', tipo: 'aseguradora', estado: 'activo', prima: 39000, actualizado: '2025-03-05' },
    { id: 5, nombre: 'Plan Joven', aseguradora: 'VidaPlus', tipo: 'plan', estado: 'activo', prima: 18000, actualizado: '2025-02-18' }
  ];

  /** Currently visible rows (after applying local filters) */
  rows: Array<any> = [...this.allRows];

  /** Columns to show in the table */
  columns: GenericColumn[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'Cobertura', header: 'Cobertura' },
    { field: 'tipo', header: 'Tipo' },
    { field: 'estado', header: 'Estado' },
    { field: 'prima', header: 'Prima' },
    { field: 'actualizado', header: 'Actualizado' }
  ];

  /** Table configuration for the demo */
  config: AdvancedTableConfig = {
    showGlobalFilter: true,
    showFilterButton: true,
    exportCsv: true, // muestra botón exportar (Excel/PDF en popover)
    showAddButton: true,
    showActions: true,
    expandable: true,
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [5, 10, 25],
    reorderableColumns: true,
    scrollable: false,
    stickyFirstColumn: false,
    showPaginationControls: true,
    showRowsPerPageSelector: true
  };

  /** Flags for active filters and counter */
  filtersActive = false;
  filtersCount: number | undefined = undefined;

  /** Filter panel controls state */
  filterStatus: 'activo' | 'inactivo' | '' = '';
  filterMinPrima: number | null = null;

  /** Row actions based on type (status) */
  rowTypeKey = 'estado';
  rowTypeActions: Record<string, TableAction[]> = {
    active: [
      { type: 'ver', label: 'Ver', icon: 'pi pi-eye' },
      { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' },
      { type: 'deshabilitar', label: 'Deshabilitar', icon: 'pi pi-ban', disabled: (row) => row?.['estado'] !== 'activo' }
    ],
    inactive: [
      { type: 'ver', label: 'Ver', icon: 'pi pi-eye' },
      { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' },
      { type: 'habilitar', label: 'Habilitar', icon: 'pi pi-check', disabled: (row) => row?.['estado'] !== 'inactivo' }
    ],
    default: [
      { type: 'ver', label: 'Ver', icon: 'pi pi-eye' },
      { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' }
    ]
  };

  /** Handles the action executed from the context menu of a row */
  onRowAction(_evt: { type: string; row: any }): void { /* demo no-op */ }
  /** Handles the export action from the popover */
  onExport(_evt: { type: 'excel' | 'pdf' }): void { /* demo no-op */ }
  /** Handles click on the Add button in the toolbar */
  onAdd(): void { /* demo no-op */ }

  /** Handles events emitted from the filter panel (apply/clear) */
  onFilterEvent(evt: { type: string; payload?: any }): void {
    if (evt.type === 'apply') {
      const { status, minPrima } = evt.payload ?? {};
      const statusNorm = (status ?? '').toString();
      const min = Number(minPrima ?? 0);

      this.filterStatus = (statusNorm === 'active' || statusNorm === 'inactive') ? statusNorm : '';
      this.filterMinPrima = Number.isFinite(min) && min > 0 ? min : null;

      this.applyLocalFilters();
    } else if (evt.type === 'clear') {
      this.filterStatus = '';
      this.filterMinPrima = null;
      this.rows = [...this.allRows];
      this.filtersActive = false;
      this.filtersCount = undefined;
    }
  }

  /** Applies local filters to the example dataset */
  private applyLocalFilters(): void {
    let result = [...this.allRows];
    let count = 0;

    if (this.filterStatus) {
      result = result.filter(r => r['estado'] === this.filterStatus);
      count += 1;
    }
    if (this.filterMinPrima !== null) {
      result = result.filter(r => (r['prima'] ?? 0) >= (this.filterMinPrima as number));
      count += 1;
    }

    this.rows = result;
    this.filtersActive = count > 0;
    this.filtersCount = count > 0 ? count : undefined;
  }

  /** Log when select opens (demo only) */
  onSelectShow(): void { /* demo log */ }
  /** Log when select closes (demo only) */
  onSelectHide(): void { /* demo log */ }
  /** Log when select changes (demo only) */
  onSelectChange(_evt: any): void { /* demo log */ }
  /** Log when filter status changes (demo only) */
  onFilterStatusChange(_val: string): void { /* demo log */ }

  /** Click apply filters: emit and close popover */
  onFilterApplyClicked(api: any): void {
    api.emit('apply', { status: this.filterStatus, minPrima: this.filterMinPrima });
    api.close();
  }
  /** Click clear filters: emit clear */
  onFilterClearClicked(api: any): void {
    api.emit('clear');
  }
}
