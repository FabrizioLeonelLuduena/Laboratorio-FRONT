# GenericButtonComponent

Botón genérico reutilizable con **estilos predefinidos**, **ícono**, **texto**, **bordes personalizables** y **atajos de teclado fijos**.  
Permite mantener un diseño coherente y flexible en toda la aplicación, tanto para botones estándar como personalizados.

---

## Propósito

Centraliza el diseño y el comportamiento de los botones, facilitando su reutilización.  
Cada tipo tiene asignado un color, ícono, texto y atajo de teclado visibles en el tooltip.

---

## Tipos disponibles

| Tipo | Texto | Ícono | Fondo | Color de texto | Tecla |
|------|--------|--------|--------|----------------|-------|
| `save` | Guardar | `pi pi-file` | `--brand-primary-700` | `--on-primary` | F4 |
| `accept` | Aceptar | `pi pi-check` | `--brand-primary-700` | `--on-primary` | F2 |
| `cancel` | Cancelar | `pi pi-times` | `--brand-warn` | `--on-primary` | F1 |
| `back` | ← | `pi pi-arrow-left` | `--card` | `--on-surface` | Escape |
| `advance` | → | `pi pi-arrow-right` | `--card` | `--on-surface` | F7 |
| `search` | Buscar | `pi pi-search` | `--card` | `--on-surface` | F3 |
| `create` | + | `pi pi-plus` | `--brand-primary-700` | `--on-primary` | F5 |
| `custom` | Personalizable | Variable (`icon`, `text`, `color`, `textColor`, `borderColor`) | Variable | Variable | — |
| `alternative` | Personalizable | Variable (`icon`, `text`) | `--brand-accent` | Negro (`#000`) | F9 |

---

## Inputs

| Propiedad | Tipo | Descripción |
|------------|------|--------------|
| `type` | `'save' | 'accept' | 'cancel' | 'back' | 'advance' | 'search' | 'create' | 'custom' | 'alternative'` | Define el tipo de botón. |
| `text` | `string` | Texto visible del botón (usado en `custom` y `alternative`). |
| `icon` | `string` | Ícono PrimeIcons (ej. `pi pi-download`). |
| `color` | `string` | Variable CSS para el color de fondo (solo `custom`). |
| `customTextColor` | `string` | Color de texto personalizado (solo `custom`). |
| `borderColor` | `string` | Variable CSS para el borde (solo `custom`). |
| `disabled` | `boolean` | Desactiva el botón. |

---

## Output

| Evento | Tipo | Descripción |
|---------|------|-------------|
| `pressed` | `EventEmitter<Event | KeyboardEvent>` | Se emite al hacer clic o al usar el atajo de teclado correspondiente. |

---

## Estilos especiales

- El componente soporta una clase `.fill` para ocupar **todo el ancho del contenedor**.
  ```css
  :host(.fill) {
    display: flex;
    width: 100%;
  }
  :host(.fill) .btn {
    width: 100%;
    justify-content: flex-start;
    padding-left: 12px;
  }
  ```

- En dispositivos móviles (`<=768px`), el botón ocupa el 100% del ancho automáticamente.

---

## Lógica interna

- Cada tipo tiene un **preset** con texto, ícono, color, borde y tecla asociada.
- Si el tipo es `custom`, los valores provienen de los inputs definidos por el usuario.
- Los atajos (`F1`, `F2`, `Escape`, etc.) se escuchan globalmente mediante `@HostListener('document:keydown')`.

---

## Ejemplo de uso

```html
<!-- Botones estándar -->
<app-generic-button type="save" (pressed)="onSave()"></app-generic-button>
<app-generic-button type="cancel" (pressed)="onCancel()"></app-generic-button>

<!-- Botón custom totalmente configurable -->
<app-generic-button
  type="custom"
  text="Exportar"
  icon="pi pi-download"
  color="--brand-accent"
  customTextColor="--on-primary"
  borderColor="--brand-accent"
  (pressed)="onExport()">
</app-generic-button>

<!-- Tipo alternative -->
<app-generic-button
  type="alternative"
  text="Vista previa"
  icon="pi pi-eye"
  (pressed)="onPreview()">
</app-generic-button>

<!-- Ocupa todo el ancho del contenedor -->
<app-generic-button
  class="fill"
  type="custom"
  text="Opción del menú"
  icon="pi pi-cog"
  (pressed)="onConfig()">
</app-generic-button>
```

---

## Dependencias

- **Angular standalone component**
- **PrimeIcons** para íconos (`pi pi-*`)
- Variables de color del sistema (`--brand-primary-700`, `--on-primary`, `--card`, etc.)

---

## Notas adicionales

- Los tooltips incluyen automáticamente la tecla asignada (ejemplo: `Guardar (F4)`).
- El evento `pressed` maneja tanto clics como teclas rápidas.
- Compatible con temas personalizados mediante variables CSS.

---

## Ejemplo visual (CSS)

El botón incluye estilos base y variantes como `.save`, `.cancel`, `.search`, `.alternative`, etc.

```css
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 120ms ease, transform 80ms ease;
}
```
