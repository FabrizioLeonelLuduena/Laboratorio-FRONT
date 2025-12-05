# Filter Component

Componente de filtros reutilizable con soporte para múltiples tipos de filtros (radio buttons y selects) con estado reactivo y conteo automático de filtros activos.

## 📦 Requisitos

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

- ✅ **Filtros de radio buttons** - Selección única entre opciones
- ✅ **Filtros de select** - Dropdown con múltiples opciones
- ✅ **Estado reactivo** - Mantiene el estado de filtros seleccionados
- ✅ **Conteo automático** - Calcula automáticamente filtros activos
- ✅ **Valores por defecto** - Soporte para opciones pre-seleccionadas con `active: true`
- ✅ **Botón limpiar** - Resetea todos los filtros a estado inicial
- ✅ **Popover** - Interfaz limpia con popover de PrimeNG
- ✅ **Badge indicador** - Muestra el número de filtros activos
- ✅ **Eventos tipados** - Emite eventos con estructura `{id, value}`

## 🚀 Uso básico

### 1. Importar el componente

```typescript
import { FilterComponent } from './shared/components/filters/filter.component';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [FilterComponent],
  // ...
})
export class MiComponente {
  // ...
}
```

### 2. Definir los filtros

```typescript
import { Filter } from './shared/models/filter.model';

dynamicFilters: Filter[] = [
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
```

### 3. Usar en el template

```html
<app-filter
  [filters]="dynamicFilters"
  (filterChange)="onFilterChange($event)"
></app-filter>
```

### 4. Manejar los cambios

```typescript
onFilterChange(event: FilterChangeEvent): void {
  console.log('Filtro cambiado:', event);
  // event = { id: 'status', value: true }
  // event = { id: 'category', value: 'stationery' }
}
```

## 🎯 Ejemplos de uso

### Filtro simple con radio buttons

```typescript
filters: Filter[] = [
  {
    id: 'availability',
    label: 'Disponibilidad',
    type: 'radio',
    options: [
      { label: 'En stock', value: 'in_stock' },
      { label: 'Agotado', value: 'out_of_stock' }
    ]
  }
];
```

### Filtro con select y valor por defecto

```typescript
filters: Filter[] = [
  {
    id: 'priority',
    label: 'Prioridad',
    type: 'select',
    options: [
      { label: 'Baja', value: 'low' },
      { label: 'Media', value: 'medium', active: true },  // Pre-seleccionado
      { label: 'Alta', value: 'high' },
      { label: 'Crítica', value: 'critical' }
    ]
  }
];
```

### Múltiples filtros combinados

```typescript
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
    id: 'department',
    label: 'Departamento',
    type: 'select',
    options: [
      { label: 'Ventas', value: 'sales' },
      { label: 'IT', value: 'it', active: true },
      { label: 'HR', value: 'hr' },
      { label: 'Finanzas', value: 'finance' }
    ]
  },
  {
    id: 'region',
    label: 'Región',
    type: 'select',
    options: [
      { label: 'Norte', value: 'north' },
      { label: 'Sur', value: 'south' },
      { label: 'Este', value: 'east' },
      { label: 'Oeste', value: 'west' }
    ]
  }
];

onFilterChange(event: FilterChangeEvent): void {
  switch(event.id) {
    case 'status':
      this.filterByStatus(event.value);
      break;
    case 'department':
      this.filterByDepartment(event.value);
      break;
    case 'region':
      this.filterByRegion(event.value);
      break;
  }
}
```

## 📚 API Reference

### Inputs

| Input | Tipo | Por defecto | Descripción |
|-------|------|-------------|-------------|
| `filters` | `Filter[]` | `[]` | Array de filtros a mostrar |

### Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `filterChange` | `FilterChangeEvent` | Emite cuando cambia un filtro con `{id, value}` |

### Interfaces

#### Filter

```typescript
interface Filter {
  id: string;                    // Identificador único del filtro
  label: string;                 // Etiqueta a mostrar
  type: 'radio' | 'select';      // Tipo de filtro
  options?: FilterOption[];      // Opciones disponibles
}
```

#### FilterOption

```typescript
interface FilterOption {
  label: string;                 // Texto a mostrar
  value: string | number | boolean;  // Valor del filtro
  active?: boolean;              // Si es true, se pre-selecciona
}
```

#### FilterChangeEvent

```typescript
interface FilterChangeEvent {
  id: string;                    // ID del filtro que cambió
  value: string | number | boolean | null;  // Nuevo valor
}
```

## 🎨 Características internas

### Estado reactivo

El componente mantiene un estado local (`localFilters`) que se sincroniza automáticamente con los filtros de entrada usando `effect()`. Esto permite:

- Persistir la selección del usuario
- Mantener el estado al cerrar/abrir el popover
- Actualizar el badge de conteo automáticamente

### Conteo automático

El número de filtros activos se calcula automáticamente con `computed()`:

```typescript
filtersCount = computed(() => {
  return this.localFilters().reduce((count, filter) => {
    const activeOptions = filter.options?.filter(opt => opt.active).length ?? 0;
    return count + activeOptions;
  }, 0);
});
```

### Botón limpiar

Al hacer click en "Limpiar":
- Resetea todas las opciones a `active: false`
- Emite eventos `filterChange` con `value: null` para cada filtro
- El padre puede reaccionar y limpiar los datos

## 🔧 Personalización

### Estilos CSS

Puedes personalizar los estilos en `filter.component.css`:

```css
.filter-container {
  /* Contenedor principal */
}

.filter-button-wrapper {
  /* Wrapper del botón */
}

.indicator-badge {
  /* Badge con el número de filtros */
}

.filter-panel {
  /* Panel del popover */
}

.filter-section {
  /* Sección de cada filtro */
}

.filter-select {
  /* Estilos del select */
}
```

## 📝 Notas importantes

- El componente usa **PrimeNG Popover** internamente
- Requiere **Angular 19+** y **PrimeNG 19+**
- Es un componente **standalone**, no requiere módulos
- Usa **señales de ciclo de vida** de Angular (`signal`, `effect`, `computed`)
- Compatible con **Tailwind CSS** y **TailwindCSS-PrimeUI**
- El estado se mantiene localmente en el componente

## 📖 Más información

- [Documentación de PrimeNG Popover](https://primeng.org/popover)
- [Documentación de PrimeIcons](https://primeng.org/icons)
- [Angular Signals](https://angular.dev/guide/signals)

---

**Desarrollado para:** 2025-PIV-TPI-LCC-FE  
**Versión:** 1.0.0  
**Última actualización:** 2025-10-21

