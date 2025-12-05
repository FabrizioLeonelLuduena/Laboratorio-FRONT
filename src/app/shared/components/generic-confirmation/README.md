# GenericConfirmationModalComponent (V6)

Componente modal de **confirmación genérico**, reutilizable y coherente con los
**botones y estilos globales** del sistema (`styles.css`).

Se usa para confirmar acciones (guardar, eliminar, aceptar, etc.) mostrando un
mensaje, un ícono y los botones **Cancelar** y **Aceptar**.

---

## Inputs

| Propiedad | Tipo | Descripción |
|------------|------|-------------|
| `icon` | `string` | Ícono principal (clase PrimeIcons). Ej: `'pi pi-exclamation-triangle'`, `'pi pi-trash'`. |
| `title` | `string` | Título del mensaje del modal. |
| `message` | `string` | Texto descriptivo o detalle de la acción a confirmar. |

---

## Outputs

| Evento | Tipo | Descripción |
|---------|------|-------------|
| `confirmed` | `EventEmitter<void>` | Se emite cuando el usuario confirma (botón **Aceptar**). |
| `dismissed` | `EventEmitter<void>` | Se emite cuando el usuario cancela o cierra el modal. |

---

## Detalles visuales

| Elemento | Descripción | Estilo |
|-----------|-------------|--------|
| Fondo (`.overlay`) | Cubre toda la pantalla, gris translúcido, bloquea interacción detrás. | `rgba(240,240,240,0.7)` |
| Modal (`.modal`) | Contenedor blanco centrado, con sombra y borde suave. | Variables globales |
| Botón **Cancelar** | Usa el **botón genérico** con `action="cancelar"`. | Fondo rojo, texto negro, ícono ❌ |
| Botón **Aceptar** | Usa el **botón genérico** con `action="aceptar"`. | Fondo verde, texto blanco, ícono ✅ |

---

## Ejemplo de uso

```html
<app-generic-confirmation-modal
  icon="pi pi-trash"
  title="Eliminar registro"
  message="¿Estás seguro de que deseas eliminar este elemento?"
  (confirmed)="onConfirmDelete()"
  (dismissed)="onCancelDelete()">
</app-generic-confirmation-modal>
