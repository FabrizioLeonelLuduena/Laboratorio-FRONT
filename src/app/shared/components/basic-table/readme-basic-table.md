# BasicTableComponent (app-basic-table)

Componente de tabla reutilizable construido sobre Angular Material (`MatTable`). Permite mostrar datos tabulares con definición de columnas flexible y renderizado de celdas personalizable mediante `ng-template`.

## Importación y uso básico

```html
<app-basic-table [columns]="tableColumns" [data]="tableData"></app-basic-table>
```

```ts
import { Component } from '@angular/core';
import { ColumnConfig } from '../../models/column-config';

@Component({
  /* ... */
})
export class DemoComponent {
  tableColumns: ColumnConfig[] = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'name', header: 'Nombre' },
  ];

  tableData = [
    { id: 1, name: 'Ana' },
    { id: 2, name: 'Luis' },
  ];
}
```

## Inputs

- `columns: ColumnConfig[]` (requerido)
  - Define las columnas a mostrar.
  - `columnDef`: identificador único y clave del objeto de datos.
  - `header`: texto visible en el encabezado.
  - `cellRenderer?`: `TemplateRef` opcional para renderizar la celda manualmente.

- `data: T[]` (requerido)
  - Arreglo de filas. Cada objeto debe tener propiedades que coincidan con `columnDef`.

## Renderizado de celdas personalizado

Puedes pasar un `ng-template` por columna mediante `cellRenderer`. El contexto expone `row` (la fila completa).

```html
<ng-template #dateCell let-row>
  {{ row.createdAt | date:'short' }}
  <span class="v2-muted">({{ row.status }})</span>
</ng-template>

<app-basic-table
  [columns]="[
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'createdAt', header: 'Creado', cellRenderer: dateCell }
  ]"
  [data]="items"
>
</app-basic-table>
```

## Accesibilidad

- Usa la tabla nativa de Material con roles y semántica adecuados.
- Mantén encabezados claros en `header` y evita usar solo iconografía para significar estados.

## Estilos

- La tabla se beneficia de utilidades globales definidas en `src/styles.css` (`.v2-table`, etc.).
- Puedes envolver el componente en un contenedor con `.v2-surface` para un estilo más plano.

## Buenas prácticas

- Evita `SELECT *`: define solo columnas necesarias en `columns`.
- Mantén `columnDef` estable; úsalo también como key en datos.
- Para celdas complejas, mueve la lógica a pipes o componentes pequeños.

## Limitaciones actuales

- No incluye paginación/sort nativos; puedes combinarlos con `MatPaginator`/`MatSort` externamente si lo necesitás.

## API relacionada

- `ColumnConfig` (`src/app/shared/models/column-config.ts`)
  - `columnDef: string`
  - `header: string`
  - `cellRenderer?: TemplateRef`
