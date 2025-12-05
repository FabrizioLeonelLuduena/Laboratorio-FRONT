# Sistema de Tutorial Genérico

Este documento describe la arquitectura y el uso del sistema de tutoriales interactivos de la aplicación.

## Resumen General

El sistema de tutoriales permite guiar a los usuarios a través de las funcionalidades clave de una página mediante una superposición (overlay) que resalta elementos específicos de la interfaz y muestra mensajes explicativos.

El sistema es modular y se compone de varias partes que trabajan en conjunto:

1.  **`TutorialService`**: Un servicio central que actúa como un "disparador" de tutoriales.
2.  **`NavbarComponent`**: Muestra el botón para iniciar el tutorial en las páginas que lo tienen disponible.
3.  **`TutorialOverlayComponent`**: El componente visual que renderiza el tutorial (el overlay, los mensajes y el resaltado).
4.  **Componente Anfitrión**: Cualquier componente de una página (por ejemplo, `UserManagementComponent`) que define y controla su propio tutorial.

---

## Flujo de Funcionamiento

1.  **Navegación**: El usuario navega a una ruta, por ejemplo, `/user-management`.
2.  **Detección en Navbar**: `NavbarComponent` detecta el cambio de ruta. Si la nueva URL coincide con una de las rutas predefinidas que tienen un tutorial, muestra un botón con el ícono `pi-question-circle`.
3.  **Inicio del Tutorial**: El usuario hace clic en el botón de tutorial.
    - `NavbarComponent` llama a `tutorialService.startTutorial(urlActual)`.
    - El `TutorialService` emite un evento a través de un `Subject` de RxJS, notificando a toda la aplicación que se debe iniciar un tutorial para esa URL.
4.  **Activación en el Componente Anfitrión**:
    - El componente anfitrión de la página (ej. `UserManagementComponent`) está suscrito a los eventos del `TutorialService`.
    - Al recibir el evento, comprueba si la URL emitida corresponde a su propia página.
    - Si coincide, define la configuración del tutorial (`TutorialConfig`) con todos los pasos necesarios.
    - Finalmente, obtiene una referencia a su `TutorialOverlayComponent` (usando `@ViewChild`) y llama al método `start()` para comenzar.
5.  **Renderizado del Tutorial**:
    - `TutorialOverlayComponent` se activa, muestra el fondo oscuro y comienza a procesar el primer paso.
    - Resalta el elemento del DOM especificado en la propiedad `target` del paso y muestra el mensaje correspondiente.
6.  **Interacción del Usuario**: El usuario navega por los pasos con los botones "Siguiente", "Anterior" y "Finalizar". El `TutorialOverlayComponent` se encarga de actualizar la vista en cada paso.

---

## Cómo Implementar un Nuevo Tutorial

Para añadir un tutorial a una página nueva, sigue estos pasos:

### 1. Registrar la Ruta del Tutorial

En `src/app/shared/components/navbar/navbar.component.ts`, añade la clave de la ruta principal a la lista `tutorialRoutes`. Esto hará que el botón de tutorial aparezca automáticamente en esa sección de la aplicación.

```typescript
// src/app/shared/components/navbar/navbar.component.ts

export class NavbarComponent implements OnInit, OnDestroy {
  // ...
  private readonly tutorialRoutes: TutorialKey[] = [
    'coverage-administration',
    'care-management',
    'procurement-inventory',
    'user-management',
    // ...Añade tu nueva ruta aquí
    'mi-nueva-ruta-con-tutorial'
  ];
  // ...
}
```

### 2. Integrar el Tutorial en el Componente Anfitrión

En el componente de la página que tendrá el tutorial (por ejemplo, `MiPagina.component.ts`):

**a. Añade el componente del tutorial a la plantilla HTML:**

Incluye `app-tutorial-overlay` y asígnale una referencia de plantilla (ej. `#tutorial`).

```html
<!-- mi-pagina.component.html -->

<!-- Contenido normal de la página -->
<div id="elemento-a-resaltar-1">...</div>
<button class="mi-boton-especial">...</button>

<!-- Componente del tutorial (no se muestra hasta que se activa) -->
<app-tutorial-overlay #tutorial [config]="tutorialConfig"></app-tutorial-overlay>
```

**b. Implementa la lógica en el archivo TypeScript:**

- Importa los servicios y componentes necesarios.
- Suscríbete al `TutorialService` para escuchar cuándo iniciar el tutorial.
- Define la configuración de los pasos (`TutorialConfig`).
- Usa `@ViewChild` para obtener una referencia al `TutorialOverlayComponent`.

```typescript
// mi-pagina.component.ts
import { Component, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

// Importaciones clave del tutorial
import { TutorialService } from 'src/app/shared/services/tutorial.service';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig, TutorialStep } from 'src/app/shared/models/generic-tutorial';

@Component({
  //...
})
export class MiPaginaComponent implements OnInit, OnDestroy {
  // Referencia al componente del tutorial en el template
  @ViewChild('tutorial') tutorialOverlay!: TutorialOverlayComponent;

  // Signal para la configuración del tutorial
  tutorialConfig = signal<TutorialConfig>({ steps: [] });

  private tutorialSubscription: Subscription | undefined;

  constructor(private tutorialService: TutorialService) {}

  ngOnInit() {
    this.setupTutorial();
  }

  ngOnDestroy() {
    this.tutorialSubscription?.unsubscribe();
  }

  private setupTutorial() {
    // Escucha los eventos del servicio de tutorial
    this.tutorialSubscription = this.tutorialService.trigger$
      .pipe(
        // Filtra para reaccionar solo a la URL de esta página
        filter(url => url.includes('mi-nueva-ruta-con-tutorial'))
      )
      .subscribe(() => {
        // Define los pasos del tutorial
        const steps: TutorialStep[] = [
          {
            target: '#elemento-a-resaltar-1', // Selector CSS del elemento a resaltar
            title: 'Paso 1: Este es el primer elemento',
            message: 'Aquí puedes ver información importante. Haz clic en "Siguiente" para continuar.',
            position: 'bottom' // Posición del mensaje respecto al elemento
          },
          {
            target: '.mi-boton-especial',
            title: 'Paso 2: Un botón de acción',
            message: 'Este botón te permite realizar una acción crítica en el sistema.',
            position: 'right'
          }
        ];

        // Crea la configuración completa
        const config: TutorialConfig = {
          steps: steps,
          onComplete: () => console.log('Tutorial completado'),
          onSkip: () => console.log('Tutorial omitido')
        };

        // Actualiza el signal y arranca el tutorial
        this.tutorialConfig.set(config);
        
        // Pequeña espera para que Angular procese el cambio en el signal
        setTimeout(() => this.tutorialOverlay.start(), 100);
      });
  }
}
```

---

## Configuración de Pasos (`TutorialStep`)

Cada paso en el tutorial es un objeto que puede tener las siguientes propiedades:

| Propiedad          | Tipo                      | Obligatorio | Descripción                                                                                                                               |
| ------------------ | ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `target`           | `string`                  | Sí          | Un selector CSS (como `#mi-id` o `.mi-clase`) que identifica el elemento del DOM a resaltar.                                               |
| `title`            | `string`                  | Sí          | El título que se mostrará en la cabecera del mensaje del tutorial.                                                                        |
| `message`          | `string`                  | Sí          | El contenido principal del mensaje.                                                                                                       |
| `position`         | `'top' \| 'bottom' \| 'left' \| 'right'` | No          | La posición del cuadro de mensaje en relación con el elemento resaltado. **Valor por defecto: `'bottom'`**.                               |
| `highlightPadding` | `number`                  | No          | Un `padding` adicional (en píxeles) para el área resaltada, por si el cálculo automático no es suficiente. **Valor por defecto: `8`**.      |
| `onEnter`          | `() => void`              | No          | Una función de callback que se ejecuta **antes** de que el paso se muestre. Útil para realizar acciones como abrir un menú desplegable. |

### Selector Especial: `:table-intro`

El sistema tiene un selector especial para resaltar la cabecera y la primera fila de una tabla simultáneamente. Esto es útil para introducciones a tablas de datos.

Para usarlo, simplemente añade `:table-intro` al selector CSS del contenedor de la tabla.

**Ejemplo:**

```typescript
const steps: TutorialStep[] = [
  {
    // Suponiendo que tienes <div id="mi-tabla-wrapper">...<table>...</table>...</div>
    target: '#mi-tabla-wrapper:table-intro',
    title: 'Introducción a la Tabla',
    message: 'Esta tabla muestra datos importantes. La cabecera define las columnas y la primera fila es un ejemplo de un registro.',
    position: 'bottom'
  }
];
```