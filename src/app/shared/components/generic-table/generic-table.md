# Generic Table with PrimeNG (Angular 19)

## Description
Reusable, configurable generic table built with PrimeNG 19 and Angular 19, offering a modern, responsive UI and complete data handling capabilities.

## Features

- Advanced filters: radio buttons and dropdowns
- Global search across all fields
- Expandable rows with a customizable template
- Column sorting (asc/desc)
- Pagination (10 rows by default)
- Row actions via contextual menu
- Export hooks (Excel and PDF)
- Loading state
- Customizable empty message
- Status badges for boolean/status fields
- Responsive design

## Requirements

Standalone Angular 19 components.

```bash
npm install primeng primeicons
```

Add your PrimeNG theme and CSS in your global styles if required.

## Basic usage

### 1. Import the component

```ts
import { Component, signal } from '@angular/core';
import { GenericTableComponent } from './shared/components/generic-table/generic-table.component';
import { Filter, FilterChangeEvent } from './shared/models/filter.model';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [GenericTableComponent],
  templateUrl: './my-component.component.html'
})
export class MyComponent {
  columns = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'role', header: 'Rol', sortable: true },
    { field: 'is_active', header: 'Estado', sortable: true },
    { field: 'created_at', header: 'Fecha Alta', sortable: true }
  ];

  data = [
    { id: 1, name: 'María Gómez', role: 'Admin', is_active: true, created_at: '2024-10-01' },
    { id: 2, name: 'Juan Pérez', role: 'User', is_active: false, created_at: '2024-10-02' }
  ];

  filters: Filter[] = [
    {
      id: 'is_active',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Activos', value: true },
        { label: 'Inactivos', value: false }
      ]
    },
    {
      id: 'role',
      label: 'Rol',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Admin', value: 'Admin' },
        { label: 'User', value: 'User' }
      ]
    }
  ];

  onFilterChange(event: FilterChangeEvent): void {
    // Implement filtering logic here or handle it server-side
  }

  getActionsForRow(row: any) {
    return [
      { label: 'Ver', icon: 'pi pi-eye', command: () => this.viewRow(row) },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editRow(row) },
      { label: 'Eliminar', icon: 'pi pi-trash', command: () => this.deleteRow(row) }
    ];
  }
}
```

### 2. HTML template

```html
<app-generic-table
  [data]="data"
  [columns]="columns"
  [filters]="filters"
  [expandedRowTemplate]="rowExpansion"
  [getActions]="getActionsForRow.bind(this)"
  (filterChange)="onFilterChange($event)"
  (downloadExcel)="onExportExcel()"
  (downloadPdf)="onExportPdf()"
  (create)="onCreate()"
  [showSearch]="true"
  [showFilters]="true"
  [showCreateButton]="true"
></app-generic-table>

<ng-template #rowExpansion let-item>
  <div class="expanded-row-content">
    <!-- Custom content for expanded row -->
    <pre>{{ item | json }}</pre>
  </div>
</ng-template>
```

## Component API

### Inputs

- data: any[] — table data
- columns: Column[] — column definitions
- filters: Filter[] — filter configuration
- expandedRowTemplate: TemplateRef — expanded row content
- getActions: (row) => any[] — actions per row
- dataKey: string = 'id' — unique row identifier field
- rows: number = 10 — page size
- rowsOptions: number[] = [5,10,25] — paginator options
- pageable: boolean = true — show paginator
- paginatorPosition: 'top' | 'bottom' | 'both' = 'bottom' — paginator placement
- loading: boolean = false — loading state
- lazy: boolean = false — enables server-side pagination/filtering
- totalRecords: number = 0 — server items count (lazy)
- showSearch: boolean = true — show global search input
- showFilters: boolean = true — show filters section
- showCreateButton: boolean = true — show create button

### Outputs

- filterChange: FilterChangeEvent — emitted when filters change
- downloadExcel: void — emitted when Excel export is requested
- downloadPdf: void — emitted when PDF export is requested
- create: void — emitted when the create button is pressed
- pageChange: { first: number; rows: number } — pagination changes
- globalFilterChange: string — global search input changes (useful when lazy=true)
- sortChange: { field: string; order: 'asc'|'desc' }[] — sorting changes (useful when lazy=true)

### Column interface

```ts
interface Column {
  field: string;       // Campo del objeto data
  header: string;      // Texto del encabezado
  sortable?: boolean;  // Habilita ordenamiento
  template?: TemplateRef<any>; // Template opcional para personalizar la celda
  nullDisplay?: string; // Texto a mostrar si el valor es null o undefined
  pipes?: ColumnPipeConfig[];
}
```

### Column Pipe Config

```ts
export interface ColumnPipeConfigByToken {
  token: Type<PipeTransform>;
  args?: PipeArgs;
}

export interface ColumnPipeConfigByName {
  name: 'date' | 'currency' | 'number' | 'percent' | 'titlecase' | 'uppercase' | 'lowercase' | 'scale';
  args?: PipeArgs;
}

export type ColumnPipeConfig = ColumnPipeConfigByToken | ColumnPipeConfigByName;
```

### Filter interfaces

```ts
interface Filter {
  id: string;           // unique filter id (must match a data field)
  label: string;        // filter label
  type: 'radio' | 'select';
  options?: FilterOption[];
}

interface FilterOption {
  label: string;                        // option label
  value: string | number | boolean | null;  // option value
  active?: boolean;                     // default selected
}

interface FilterChangeEvent {
  filters: Array<{ id: string; value: string | number | boolean | null }>;
  activeCount?: number;
}
```

## Notes

- Uses Angular 19 control flow in templates (@if/@for/@switch). Avoid legacy structural directives like *ngIf/*ngFor/*ngSwitch in this component.
- For server-side mode (lazy=true), listen to pageChange, globalFilterChange and sortChange to request data accordingly.
- Example labels are in Spanish in some snippets; adapt to your product language.

