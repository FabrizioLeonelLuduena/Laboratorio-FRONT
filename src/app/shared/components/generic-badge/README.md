# GenericBadgeComponent

Componente genérico para mostrar **estados visuales** como “ACTIVO”, “INACTIVO” o “PENDIENTE”.  
Usa los colores de marca definidos en el CSS global (`--brand-success`, `--brand-warn`, `--brand-primary-700`).

---

## Características

- Muestra un badge (etiqueta) con texto en mayúsculas.
- Colores adaptados al sistema visual global.
- Estilos suaves y legibles (relleno pastel, texto fuerte).
- Soporta los tres estados estándar:
  - 🟩 `activo` → verde
  - 🟥 `inactivo` → rojo
  - 🟦 `pendiente` → azul / intermedio
- Responsivo y reutilizable en listas, tablas o formularios.

---

## Inputs

| Propiedad | Tipo | Valor por defecto | Descripción |
|------------|------|------------------|--------------|
| `status` | `'activo' \| 'inactivo' \| 'pendiente'` | `'activo'` | Determina el color y estilo visual del badge. |
| `text` | `string?` | `undefined` | Texto personalizado (si no se define, se usa el nombre del estado en mayúsculas). |

---

## Uso básico

```html
<app-generic-badge status="activo"></app-generic-badge>
<app-generic-badge status="inactivo"></app-generic-badge>
<app-generic-badge status="pendiente"></app-generic-badge>
