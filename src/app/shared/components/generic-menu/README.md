# GenericMenuComponent

Componente genérico de **menú desplegable (dropdown)** activado por un botón con tres puntos verticales.  
Permite mostrar una lista de acciones configurables, reutilizando el `GenericButtonComponent` para cada opción.

Ideal para tarjetas, tablas o listados donde se requieran acciones contextuales  
como *Editar*, *Eliminar*, *Ver detalle*, *Descargar PDF*, etc.

---

## Características principales

- Botón principal con ícono `pi pi-ellipsis-v` (tres puntos).
- Menú flotante con lista de botones reutilizables (`GenericButtonComponent`).
- Cierre automático al hacer clic fuera del menú.
- Diseño limpio, moderno y consistente con el sistema visual global.
- Soporte completo para íconos, texto y color personalizados en cada acción.

---

## Inputs

| Propiedad | Tipo | Descripción |
|------------|------|-------------|
| `actions` | `{ text: string; icon: string; color?: string; onClick: () => void }[]` | Lista de acciones mostradas dentro del menú. Cada acción incluye el texto visible, el ícono PrimeIcons y la función a ejecutar. |

---

## Ejemplo básico

```html
<app-generic-menu
  [actions]="[
    { text: 'Editar', icon: 'pi pi-pencil', color: '--brand-primary-700', onClick: () => onEdit() },
    { text: 'Eliminar', icon: 'pi pi-trash', color: '--brand-warn', onClick: () => onDelete() },
    { text: 'Descargar PDF', icon: 'pi pi-file-pdf', color: '--brand-secondary', onClick: () => onDownload() }
  ]">
</app-generic-menu>
