# GenericHeaderCardComponent

Componente reutilizable que renderiza una tarjeta (card) con un encabezado estandarizado.
El encabezado incluye un botón de "Volver" a la izquierda, un título centrado y un botón de acción opcional a la derecha. El contenido principal de la tarjeta se proyecta usando `ng-content`.

---

## Propósito

El propósito de este componente es unificar la apariencia de las secciones principales de la aplicación, proporcionando una estructura consistente para los encabezados de página o de secciones importantes. Esto reduce la duplicación de código y asegura una experiencia de usuario coherente.

---

## Inputs

| Propiedad | Tipo | Descripción |
|---|---|---|
| `title` | `string` | El título que se mostrará en el centro del encabezado. |
| `optionalButtonText` | `string` | El texto para el botón de acción opcional. |
| `optionalButtonIcon` | `string` | El ícono (clase de PrimeIcons) para el botón opcional. |
| `showOptionalButton` | `boolean` | Controla si el botón de acción opcional es visible. Por defecto es `false`. |

---

## Outputs

| Evento | Tipo | Descripción |
|---|---|---|
| `backPressed` | `EventEmitter<void>` | Se emite cuando el usuario hace clic en el botón "Volver". |
| `optionalButtonPressed` | `EventEmitter<void>` | Se emite cuando el usuario hace clic en el botón de acción opcional. |

---

## Content Projection (`<ng-content>`)

El cuerpo de la tarjeta está diseñado para recibir contenido dinámico. Cualquier elemento que se coloque dentro de las etiquetas `<app-generic-header-card>` en el HTML padre será renderizado en el área de contenido, debajo del encabezado.

---

## Ejemplo de uso

```html
<!-- Ejemplo Básico: solo con título -->
<app-generic-header-card
  title="Detalle de Aseguradora"
  (backPressed)="goBack()">

  <!-- Contenido proyectado aquí -->
  <p>Este es el cuerpo de la tarjeta.</p>
  <app-insurer-details [insurer]="currentInsurer"></app-insurer-details>

</app-generic-header-card>

<!-- Ejemplo Completo: con botón de acción opcional -->
<app-generic-header-card
  title="Lista de Contactos"
  (backPressed)="goBack()"
  [showOptionalButton]="true"
  optionalButtonText="Agregar Contacto"
  optionalButtonIcon="pi pi-plus"
  (optionalButtonPressed)="openAddContactForm()">

  <!-- Contenido proyectado aquí -->
  <app-contacts-list [contacts]="contacts"></app-contacts-list>

</app-generic-header-card>
```

---

## Dependencias

- **Angular** (standalone component)
- **PrimeIcons** para los íconos.
- **`GenericButtonComponent`** para los botones del encabezado.
- **Variables de CSS del proyecto** para estilos (`--border-color`, `title-20`, etc.).
