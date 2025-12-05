# 🧩 LoginFormComponent

## 📘 Descripción

`LoginFormComponent` es un componente genérico y reutilizable para manejar formularios de autenticación y pantallas similares (como recuperación o reseteo de contraseña).
Está construido sobre **Reactive Forms** e integra otros componentes genéricos del sistema (`GenericForm`, `GenericButton`) para mantener un estilo y comportamiento uniforme en todas las pantallas de autenticación.
Permite tanto un **login clásico (usuario y contraseña)** como **formularios personalizados**, proyectando contenido adicional (por ejemplo, mensajes de éxito o error).

---

## 🚀 Características
- Basado en **Angular standalone components**.
- Usa **ReactiveFormsModule** y validaciones integradas.
- Permite **personalizar títulos, subtítulos, íconos y fondo**.
- Integra un **GenericForm** para casos de formularios custom (por ejemplo, cambio de contraseña o recuperación).
- Proyecta contenido dinámico cuando `showInnerForm` es `false` (para mostrar pantallas de éxito, error, etc.).
- Compatible con el **tema y paleta de colores** del sistema.

---

## 📦 Importación

```ts
import { LoginFormComponent } from 'src/app/shared/components/login-form/login-form.component';
```

---

## ⚙️ Inputs
| Nombre              | Tipo                                                                                            | Descripción                                                                                      | Default                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `title`             | `string`                                                                                        | Título principal del formulario.                                                                 | `'¡Bienvenido!'`                          |
| `subtitle`          | `string`                                                                                        | Subtítulo o descripción breve.                                                                   | `'Ingresa tus credenciales para acceder'` |
| `logoSrc`           | `string`                                                                                        | Ruta del logo a mostrar.                                                                         | `'LCC-logo-horizontal.png'`               |
| `submitLabel`       | `string`                                                                                        | Texto del botón de envío.                                                                        | `'Iniciar Sesión'`                        |
| `forgotLink`        | `string`                                                                                        | Ruta al componente de recuperación de contraseña.                                                | `'/password-recover'`                     |
| `showFooter`        | `boolean`                                                                                       | Muestra el footer institucional.                                                                 | `true`                                    |
| `showForgotLink`    | `boolean`                                                                                       | Muestra el enlace de “Recuperar contraseña”.                                                     | `true`                                    |
| `buttonStyle`       | `Record<string, any>`                                                                           | Estilos en línea personalizados para el botón.                                                   | `null`                                    |
| `buttonType`        | `'save' \| 'accept' \| 'cancel' \| 'back' \| 'search' \| 'create' \| 'custom' \| 'alternative'` | Tipo del botón genérico.                                                                         | `'create'`                                |
| `buttonColor`       | `string`                                                                                        | Color CSS variable (sin `var()`). Ejemplo: `'--brand-primary-700'`                               | `null`                                    |
| `buttonFullWidth`   | `boolean`                                                                                       | Hace que el botón ocupe todo el ancho del contenedor.                                            | `true`                                    |
| `buttonIcon`        | `string`                                                                                        | Clase del ícono PrimeIcons para el botón.                                                        | `null`                                    |
| `backgroundImage`   | `string`                                                                                        | Imagen de fondo (ruta relativa o absoluta).                                                      | `null`                                    |
| `backgroundColor`   | `string`                                                                                        | Color de fondo alternativo.                                                                      | `null`                                    |
| `fields`            | `GenericFormField[]`                                                                            | Si se define, reemplaza el login simple por un formulario genérico.                              | `null`                                    |
| `initialValue`      | `Record<string, any>`                                                                           | Valores iniciales del formulario genérico.                                                       | `null`                                    |
| `usernameKey`       | `string`                                                                                        | Clave para el campo de usuario cuando se usa formulario genérico.                                | `'username'`                              |
| `passwordKey`       | `string`                                                                                        | Clave para el campo de contraseña cuando se usa formulario genérico.                             | `'password'`                              |
| `genericShowCancel` | `boolean`                                                                                       | Muestra el botón Cancelar del formulario genérico.                                               | `true`                                    |
| `genericShowSubmit` | `boolean`                                                                                       | Muestra el botón Enviar del formulario genérico.                                                 | `true`                                    |
| `showInnerForm`     | `boolean`                                                                                       | Controla si se muestra el formulario o el contenido proyectado (por ejemplo, pantalla de éxito). | `true`                                    |
| `headerIcon`        | `string`                                                                                        | Ícono opcional para mostrar en el header cuando el formulario está oculto.                       | `null`                                    |

---

## 📤 Outputs
| Nombre        | Tipo                | Descripción                                                                                                                    |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `submitLogin` | `EventEmitter<any>` | Se emite cuando el formulario es válido y se envía. Retorna un objeto `{ username, password }` o los valores de `GenericForm`. |

---

## 🧠 Métodos principales
- `onSubmit()` -> Envía el formulario interno si es válido y emite el evento submitLogin.
- `onGenericSubmit(payload)` -> Se ejecuta cuando el formulario genérico (GenericForm) emite submitForm.
- `togglePassword()` -> Alterna la visibilidad del campo de contraseña.
- `backgroundStyle (getter)` -> Calcula dinámicamente el estilo de fondo (imagen o color).

---

## 💡 Ejemplos de uso
 ### 1️⃣ Login básico
 #### html
 ```html
 <app-login-form (submitLogin)="onLogin($event)"></app-login-form>

 ```
 #### ts
 ```ts
 onLogin(data: { username: string; password: string }) {
  this.authService.login(data).subscribe(...);
}
```
---

### 2️⃣ Con formulario genérico
 #### html
 ```html
 <app-login-form
  [fields]="resetPasswordFields"
  [title]="'Cambiar Contraseña'"
  [subtitle]="'Ingresa y confirma tu nueva contraseña'"
  [buttonType]="'custom'"
  [buttonColor]="'--brand-primary-700'"
  [buttonIcon]="'pi pi-lock'"
  [showForgotLink]="false"
  (submitLogin)="onReset($event)">
</app-login-form>
 ```
 #### ts
 ```ts
 resetPasswordFields: GenericFormField[] = [
  { name: 'password', label: 'Nueva Contraseña', type: 'password', required: true },
  { name: 'confirmPassword', label: 'Confirmar Contraseña', type: 'password', required: true }
];

onReset(data: any) {
  this.passwordService.reset(data.password);
}
```

---

### 3️⃣ Con contenido proyectado 
 #### html
 ```html
 <app-login-form
  [showInnerForm]="false"
  [headerIcon]="'pi pi-check-circle'"
  [title]="'¡Contraseña actualizada!'"
  [subtitle]="'Ahora puedes iniciar sesión con tu nueva contraseña.'">
  
  <div recover-success>
    <app-generic-button
      text="Volver al login"
      icon="pi pi-arrow-left"
      type="custom"
      color="--brand-primary-700"
      routerLink="/login">
    </app-generic-button>
  </div>
</app-login-form>
 ```
---

## 🧱 Dependencias

- ReactiveFormsModule
- RouterModule
- primeng/button
- primeng/inputtext
- primeng/password
- primeng/iconfield
- Componentes internos:
    - GenericFormComponent
    - GenericButtonComponent
---

## 🧪 Buenas prácticas
- Si necesitás solo usuario/contraseña, usá el formulario interno.
- Si querés más campos (ej. email, confirmación, etc.), pasá un arreglo fields con el mismo formato que usa `GenericFormComponent`.
- Si ocultás el formulario (`showInnerForm = false`), asegurate de proyectar contenido.
- No olvides manejar la emisión (`submitLogin`) correctamente; el componente no hace login por sí mismo, solo emite los datos.




