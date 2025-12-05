# ⏳ SpinnerComponent

## 📘 Descripción

El componente `SpinnerComponent` muestra un **indicador de carga animado** (spinner) que sirve para indicar al usuario que el sistema está procesando una acción o esperando una respuesta del servidor.

Puede mostrarse **en línea (inline)** o **en modo overlay**, cubriendo la pantalla con un fondo semitransparente para indicar que la interfaz está bloqueada temporalmente.

---

## 🚀 Características

- Spinner circular con animación CSS personalizada.
- Dos modos de visualización:
  - **Inline:** se integra en el flujo del contenido.
  - **Overlay:** cubre toda la pantalla con un fondo oscuro.
- Muestra un **mensaje opcional** debajo del spinner.
- Cumple con **accesibilidad básica** (`role="status"` y `aria-live`).

---

## 📦 Importación

```ts
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
```
---

## Inputs

| Propiedad | Tipo | Descripción | Valor por defecto |
|------------|------|-------------|-------------------|
| `label` | `string \| null` | Texto opcional que se muestra debajo del spinner. | `null` |
| `overlay` | `boolean` | Si es `true`, el spinner se muestra con un fondo semitransparente que cubre toda la pantalla. | `false` |

---

## 💡 Ejemplos de uso
### 1️⃣ Spinner inline (sin overlay)
#### html
```html
<app-spinner label="Cargando datos..."></app-spinner>

```
➡️ Ideal para mostrar carga dentro de un contenedor o formulario sin bloquear toda la interfaz.

---

### 2️⃣ Spinner con overlay
#### html
```html
<app-spinner [overlay]="true" label="Procesando solicitud..."></app-spinner>

```
➡️ Muestra el spinner centrado en pantalla con un fondo oscuro que impide la interacción del usuario mientras se ejecuta un proceso.

---

## Ejemplo completo
#### html
```html
@if (loading) {
  <app-spinner [overlay]="true" label="Validando credenciales..."></app-spinner>
}

<form *ngIf="!loading" (ngSubmit)="onSubmit()">
  <!-- Campos del formulario -->
</form>

```
#### ts
```ts
loading = false;

onSubmit() {
  this.loading = true;
  this.authService.login(this.credentials).subscribe({
    next: () => this.loading = false,
    error: () => this.loading = false
  });
}
```
---

## 🧠 Buenas prácticas

- Usar overlay=true solo cuando sea necesario bloquear la pantalla (por ejemplo, durante autenticaciones o validaciones).
- Mantener el mensaje label corto y claro.
- Evitar anidar varios spinners al mismo tiempo.
- Incluir el componente dentro de una condición (@if (loading)) para evitar renderizarlo constantemente.