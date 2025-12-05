# Advanced Table Component

Componente de tabla avanzada reutilizable basado en PrimeNG con funcionalidades completas para aplicaciones empresariales.

## 📦 Requisito

Asegurarse de agregar primeicons en package.json e importar los estilos:

```json
{
  "dependencies": {
    "primeicons": "^7.0.0"
  }
}
```

Y en src/styles.css:
```css
@import "primeicons/primeicons.css";
```

## 📋 Características

- ✅ **Filtrado global** - Búsqueda en todas las columnas
- ✅ **Paginación** - Navegación por páginas con opciones personalizables
- ✅ **Ordenamiento** - Ordenar por cualquier columna
- ✅ **Acciones por fila** - Menú contextual con acciones personalizables
- ✅ **Reordenamiento de columnas** - Drag & drop para reorganizar
- ✅ **Scroll horizontal** - Para tablas con muchas columnas
- ✅ **Primera columna fija** - Mantener la primera columna visible al hacer scroll
- ✅ **Lazy loading** - Carga de datos bajo demanda desde el backend
- ✅ **Exportar a CSV** - Descargar datos de la tabla (botón con ícono)
- ✅ **Botón “+” opcional** - Acceso rápido a creación (oculto por defecto)
- ✅ **Estados de carga** - Indicador visual durante la carga de datos
- ✅ **Responsive** - Se adapta a diferentes tamaños de pantalla

## 🚀 Uso básico

### 1. Importar el componente

```typescript
import { AdvancedTableComponent, GenericColumn, AdvancedTableConfig, TableAction } from './shared/components/advanced-table/advanced-table.component';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [AdvancedTableComponent],
  // ...
})
export class MiComponente {
  // ...
}
```

### 2. Definir las columnas

```typescript
columns: GenericColumn[] = [
  { field: 'id', header: 'ID' },
  { field: 'nombre', header: 'Nombre' },
  { field: 'email', header: 'Email' },
  { field: 'estado', header: 'Estado' }
];
```

### 3. Preparar los datos

```typescript
data = [
  { id: 1, nombre: 'Juan Pérez', email: 'juan@example.com', estado: 'Activo' },
  { id: 2, nombre: 'María García', email: 'maria@example.com', estado: 'Inactivo' },
  { id: 3, nombre: 'Pedro López', email: 'pedro@example.com', estado: 'Activo' }
];
```

### 4. Configurar la tabla

```typescript
config: AdvancedTableConfig = {
  showGlobalFilter: true,
  showActions: true,
  paginator: true,
  rows: 10
};
```

### 5. Usar en el template

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
></app-advanced-table>
```

## 🎯 Ejemplos de uso

### Tabla simple (solo lectura)

```typescript
columns: GenericColumn[] = [
  { field: 'id', header: 'ID' },
  { field: 'producto', header: 'Producto' },
  { field: 'precio', header: 'Precio' }
];

data = [
  { id: 1, producto: 'Laptop', precio: 1500 },
  { id: 2, producto: 'Mouse', precio: 25 }
];

config: AdvancedTableConfig = {
  paginator: true,
  rows: 10
};
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
></app-advanced-table>
```

### Tabla con búsqueda global

```typescript
config: AdvancedTableConfig = {
  showGlobalFilter: true,  // Habilita el buscador
  paginator: true,
  rows: 10
};
```

### Tabla con acciones

```typescript
// Definir las acciones disponibles
actions: TableAction[] = [
  { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' },
  { type: 'eliminar', label: 'Eliminar', icon: 'pi pi-trash' },
  { type: 'ver', label: 'Ver detalles', icon: 'pi pi-eye' }
];

// Configurar la tabla para mostrar acciones
config: AdvancedTableConfig = {
  showActions: true,  // Habilita la columna de acciones
  paginator: true,
  rows: 10
};

// Manejar las acciones
onAction(event: { type: string; row: Record<string, any> }): void {
  console.log('Acción:', event.type);
  console.log('Fila:', event.row);

  switch(event.type) {
    case 'editar':
      this.editarRegistro(event.row);
      break;
    case 'eliminar':
      this.eliminarRegistro(event.row);
      break;
    case 'ver':
      this.verDetalles(event.row);
      break;
  }
}
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
  [actionItems]="actions"
  (action)="onAction($event)"
></app-advanced-table>
```

### Tabla con exportación a CSV

```typescript
config: AdvancedTableConfig = {
  exportCsv: true,  // Habilita el botón de exportar (ícono)
  paginator: true,
  rows: 10
};
```

### Botón de creación “+” en la toolbar

El botón es opcional y no rompe usos existentes. Debe habilitarse con `showAddButton` y escuchar el output `addClicked`.

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="{ ...config, showAddButton: true }"
  (addClicked)="onCreateRequested()"
></app-advanced-table>
```

```typescript
onCreateRequested(): void {
  // Navegar o abrir modal de creación
}
```

### Tabla con scroll horizontal y primera columna fija

```typescript
config: AdvancedTableConfig = {
  scrollable: true,
  scrollHeight: '400px',
  stickyFirstColumn: true,  // La primera columna permanece fija
  paginator: true,
  rows: 10
};
```

### Tabla con lazy loading (carga desde backend)

```typescript
config: AdvancedTableConfig = {
  lazy: true,  // Habilita lazy loading
  paginator: true,
  rows: 10
};

totalRecords = 0;
loading = false;

onLazyLoad(event: TableLazyLoadEvent): void {
  this.loading = true;

  // Llamar al servicio con parámetros de paginación, filtros y ordenamiento
  this.miServicio.obtenerDatos({
    first: event.first,
    rows: event.rows,
    sortField: event.sortField,
    sortOrder: event.sortOrder,
    filters: event.filters
  }).subscribe(response => {
    this.data = response.data;
    this.totalRecords = response.total;
    this.loading = false;
  });
}
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
  [loading]="loading"
  [totalRecords]="totalRecords"
  (lazyLoad)="onLazyLoad($event)"
></app-advanced-table>
```

### Tabla con filtros integrados y acciones

```typescript
import { Filter, FilterChangeEvent } from './shared/models/filter.model';

columns: GenericColumn[] = [
  { field: 'id', header: 'ID' },
  { field: 'nombre', header: 'Nombre' },
  { field: 'estado', header: 'Estado' },
  { field: 'categoria', header: 'Categoría' }
];

data = [
  { id: 1, nombre: 'Producto A', estado: true, categoria: 'electronics' },
  { id: 2, nombre: 'Producto B', estado: false, categoria: 'stationery' }
];

filters: Filter[] = [
  {
    id: 'estado',
    label: 'Estado',
    type: 'radio',
    options: [
      { label: 'Activo', value: true },
      { label: 'Inactivo', value: false }
    ]
  },
  {
    id: 'categoria',
    label: 'Categoría',
    type: 'select',
    options: [
      { label: 'Electrónica', value: 'electronics' },
      { label: 'Papelería', value: 'stationery', active: true },
      { label: 'Limpieza', value: 'cleaning' }
    ]
  }
];

actions: TableAction[] = [
  { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' },
  { type: 'eliminar', label: 'Eliminar', icon: 'pi pi-trash' }
];

config: AdvancedTableConfig = {
  showGlobalFilter: true,
  showActions: true,
  paginator: true,
  rows: 10
};

onFilterChange(event: FilterChangeEvent): void {
  console.log('Filtro aplicado:', event);
  // Recargar datos con el nuevo filtro
  this.loadData({ [event.id]: event.value });
}

onAction(event: { type: string; row: Record<string, any> }): void {
  console.log('Acción:', event.type, 'Fila:', event.row);
}
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
  [filters]="filters"
  [actionItems]="actions"
  (filterChange)="onFilterChange($event)"
  (action)="onAction($event)"
></app-advanced-table>
```

### Tabla completa (todas las funcionalidades)

```typescript
columns: GenericColumn[] = [
  { field: 'id', header: 'ID' },
  { field: 'pedido', header: 'Pedido' },
  { field: 'cliente', header: 'Cliente' },
  { field: 'estado', header: 'Estado' },
  { field: 'total', header: 'Total' }
];

data = [
  { id: 101, pedido: 'P-001', cliente: 'ACME Corp', estado: 'Pendiente', total: 1234.56, items: 5 },
  { id: 102, pedido: 'P-002', cliente: 'Globex Inc', estado: 'Procesando', total: 987.65, items: 3 }
];

actions: TableAction[] = [
  { type: 'editar', label: 'Editar', icon: 'pi pi-pencil' },
  { type: 'eliminar', label: 'Eliminar', icon: 'pi pi-trash' },
  { type: 'duplicar', label: 'Duplicar', icon: 'pi pi-copy' }
];

config: AdvancedTableConfig = {
  showGlobalFilter: true,
  showActions: true,
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [10, 25, 50],
  exportCsv: true,
  reorderableColumns: true
};

onAction(event: { type: string; row: Record<string, any> }): void {
  console.log('Acción:', event.type, 'Fila:', event.row);
}
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
  [actionItems]="actions"
  (action)="onAction($event)"
></app-advanced-table>
```

### Filtros integrados (componente Filter)

La forma más simple de agregar filtros es usar el componente `app-filter` integrado. Solo necesitas pasar un array de filtros y escuchar el evento `filterChange`:

```typescript
import { Filter, FilterChangeEvent } from './shared/models/filter.model';

filters: Filter[] = [
  {
    id: 'status',
    label: 'Estado',
    type: 'radio',
    options: [
      { label: 'Activo', value: true },
      { label: 'Inactivo', value: false }
    ]
  },
  {
    id: 'category',
    label: 'Categoría',
    type: 'select',
    options: [
      { label: 'Electrónica', value: 'electronics' },
      { label: 'Papelería', value: 'stationery', active: true },
      { label: 'Limpieza', value: 'cleaning' }
    ]
  }
];

onFilterChange(event: FilterChangeEvent): void {
  console.log('Filtro cambiado:', event);
  // event = { id: 'status', value: true }
  // event = { id: 'category', value: 'stationery' }

  // Aquí puedes recargar los datos con el nuevo filtro
  switch(event.id) {
    case 'status':
      this.filterByStatus(event.value);
      break;
    case 'category':
      this.filterByCategory(event.value);
      break;
  }
}
```

```html
<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="config"
  [filters]="filters"
  (filterChange)="onFilterChange($event)"
></app-advanced-table>
```

**Ventajas:**
- ✅ Filtros pre-construidos (radio buttons y selects)
- ✅ Estado reactivo automático
- ✅ Conteo de filtros activos automático
- ✅ Botón "Limpiar" integrado
- ✅ Eventos tipados con `FilterChangeEvent`
- ✅ Menos código que escribir

### Botón de filtros personalizado (panel configurable)

Si necesitas filtros más complejos o personalizados, puedes usar `filterTemplate` para definir tu propia UI:

```html
<!-- Template de filtros (puede ir en el mismo componente padre) -->
<ng-template #misFiltros let-api>
  <!-- tu UI de filtros -->
  <div class="flex column gap-2">
    <!-- Ejemplo mínimo -->
    <label>
      Código
      <input type="text" [(ngModel)]="filters.code" />
    </label>
    <label>
      Activo
      <input type="checkbox" [(ngModel)]="filters.active" />
    </label>

    <div class="flex gap-2">
      <button type="button" (click)="api.emit('apply', filters); api.close()">Aplicar</button>
      <button type="button" (click)="filters = {}; api.emit('clear'); api.close()">Limpiar</button>
    </div>
  </div>
</ng-template>

<app-advanced-table
  [columns]="columns"
  [data]="data"
  [config]="{ ...config, showFilterButton: true }"
  [filterTemplate]="misFiltros"
  (filterAction)="onFilterAction($event)"
  (filterOpen)="onFilterOpen()"
  (filterClose)="onFilterClose()"
></app-advanced-table>
```

```typescript
filters: any = {};

onFilterAction(evt: { type: string; payload?: any }) {
  switch (evt.type) {
    case 'apply':
      // Llamada al backend con evt.payload
      this.searchWithFilters(evt.payload);
      break;
    case 'clear':
      this.searchWithFilters({});
      break;
  }
}

onFilterOpen() { /* opcional: tracking, focus, etc. */ }
onFilterClose() { /* opcional */ }
```

## 📚 API Reference

### Inputs

| Input | Tipo | Por defecto | Descripción |
|-------|------|-------------|-------------|
| `data` | `Record<string, any>[]` | `[]` | Array de objetos con los datos de la tabla |
| `columns` | `GenericColumn[]` | `[]` | Definición de columnas a mostrar |
| `config` | `AdvancedTableConfig` | `{ paginator: true }` | Configuración general de la tabla |
| `dataKey` | `string` | `'id'` | Campo único para identificar cada fila |
| `actionItems` | `TableAction[]` | `[]` | Lista de acciones disponibles |
| `loading` | `boolean` | `false` | Estado de carga de datos |
| `totalRecords` | `number` | `0` | Total de registros (para lazy loading) |
| `emptyMessage` | `string` | `"No se encontraron registros."` | Mensaje vacío personalizable |
| `filters` | `Filter[]` | `[]` | Array de filtros para renderizar el componente `app-filter` |
| `filterTemplate` | `TemplateRef<any>` | `undefined` | Contenido a renderizar dentro del popover de filtros personalizados |

### Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `action` | `EventEmitter<{type: string, row: Record<string, any>}>` | Emite cuando se ejecuta una acción |
| `lazyLoad` | `EventEmitter<TableLazyLoadEvent>` | Emite cuando se necesita cargar datos (lazy loading) |
| `addClicked` | `EventEmitter<void>` | Emite cuando se presiona el botón “+” de la toolbar |
| `filterChange` | `EventEmitter<FilterChangeEvent>` | Emite cuando cambia un filtro integrado con `{id, value}` |
| `filterAction` | `EventEmitter<{type: string, payload?: any}>` | Emite acciones del panel de filtros personalizado (apply/clear/custom) |
| `filterOpen` | `EventEmitter<void>` | Emite al abrir el popover de filtros |
| `filterClose` | `EventEmitter<void>` | Emite al cerrar el popover de filtros |

### Interfaces

#### GenericColumn

```typescript
interface GenericColumn {
  field: string;    // Nombre del campo en los datos
  header: string;   // Título de la columna
  template?: TemplateRef<any>; // (opcional) plantilla para la celda
}
```

#### AdvancedTableConfig

```typescript
interface AdvancedTableConfig {
  showGlobalFilter?: boolean;      // Mostrar buscador global
  showActions?: boolean;           // Mostrar columna de acciones
  paginator?: boolean;             // Habilitar paginación
  rows?: number;                   // Filas por página
  rowsPerPageOptions?: number[];   // Opciones de filas por página [10, 25, 50]
  exportCsv?: boolean;             // Habilitar exportación a CSV (ícono)
  showAddButton?: boolean;         // Muestra el botón “+” en la toolbar
  showFilterButton?: boolean;      // Muestra el botón de filtros en la toolbar
  reorderableColumns?: boolean;    // Permitir reordenar columnas
  scrollable?: boolean;            // Habilitar scroll horizontal
  scrollHeight?: string;           // Altura del scroll ('400px', 'flex')
  stickyFirstColumn?: boolean;     // Primera columna fija
  lazy?: boolean;                  // Habilitar lazy loading
}
```

#### TableAction

```typescript
interface TableAction {
  type: string;     // Identificador de la acción
  label: string;    // Texto a mostrar
  icon?: string;    // Icono de PrimeIcons (ej: 'pi pi-pencil')
}
```

## 🎨 Iconos disponibles (PrimeIcons)

Algunos iconos útiles de PrimeIcons para acciones:

- `pi pi-pencil` - Editar
- `pi pi-trash` - Eliminar
- `pi pi-eye` - Ver/Visualizar
- `pi pi-copy` - Duplicar/Copiar
- `pi pi-check` - Aprobar/Confirmar
- `pi pi-times` - Rechazar/Cancelar
- `pi pi-download` - Descargar
- `pi pi-upload` - Subir
- `pi pi-print` - Imprimir
- `pi pi-send` - Enviar
- `pi pi-cog` - Configurar
- `pi pi-lock` - Bloquear
- `pi pi-unlock` - Desbloquear
- `pi pi-refresh` - Actualizar
- `pi pi-ban` - Prohibir/Desactivar

Ver todos los iconos en: https://primeng.org/icons

## 🔧 Personalización

### Estilos CSS personalizados

Puedes agregar estilos personalizados en el archivo CSS del componente:

```css
/* advanced-table.component.css */

/* Personalizar el toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.flex-spacer {
  flex: 1;
}

/* Personalizar el estado vacío */
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--on-surface-muted);
}
```

### Filtrado personalizado por columna

Para agregar filtros específicos por columna, puedes extender el componente o usar los slots de PrimeNG directamente.

## 📝 Notas importantes

- El componente usa **PrimeNG Table** internamente
- Requiere **Angular 19+** y **PrimeNG 19+**
- Es un componente **standalone**, no requiere módulos
- Usa **señales de ciclo de vida** de Angular
- Compatible con **Tailwind CSS** y **TailwindCSS-PrimeUI**

## 📖 Más información

- [Documentación de PrimeNG Table](https://primeng.org/table)
- [Documentación de PrimeIcons](https://primeng.org/icons)
- [Angular Standalone Components](https://angular.dev/guide/components)

---

**Desarrollado para:** 2025-PIV-TPI-LCC-FE
**Versión:** 1.0.0
**Última actualización:** 2025-10-03
