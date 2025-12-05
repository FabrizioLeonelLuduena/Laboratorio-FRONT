# GenericModalComponent

Modal genérico adaptable que define únicamente el marco visual (overlay, título y botón de cierre).  
El contenido interior —como formularios, botones o vistas— es completamente libre mediante `<ng-content>`.

---

## Uso básico

```html
<app-generic-modal
  [visible]="showModal"
  [title]="'Registrar nuevo cliente'"
  [width]="'600px'"
  [height]="'auto'"
  (close)="showModal = false">

  <!-- Contenido definido por el grupo -->
  <form class="form-grid-2">
    <label>Nombre:</label>
    <input type="text" class="field-full">
    <label>Email:</label>
    <input type="email" class="field-full">
  </form>

  <div class="actions">
    <app-generic-button type="cancel" (pressed)="showModal = false"></app-generic-button>
    <app-generic-button type="accept" (pressed)="guardar()"></app-generic-button>
  </div>
</app-generic-modal>
