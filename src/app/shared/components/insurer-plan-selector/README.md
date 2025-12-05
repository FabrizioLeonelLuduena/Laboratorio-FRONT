# InsurerPlanSelectorComponent

Selector standalone (Angular 16+/19+) con PrimeNG para elegir una Aseguradora y un Plan, con sincronización bidireccional y búsqueda configurable.

## Características

- Standalone (`@Component({ standalone: true })`) y reutilizable.
- Dos AutoComplete (PrimeNG): Aseguradora y Plan.
- Búsqueda por múltiples campos configurables con `filtrosBusqueda`.
- Formato de etiqueta según filtros: si excluís `code`, no se muestra `[CODE]`.
- Sincronización: al elegir plan se selecciona automáticamente su aseguradora, y viceversa.
- Sugerencias iniciales (primeras 5) al abrir el dropdown o enfocar.
- API pública `setPlanById(id: number)` para seleccionar programáticamente.
- Emite eventos con modelos limpios (sin propiedades extra): `insurerSelected`, `planSelected`.
- Responsive (layout vertical en pantallas pequeñas) y con ícono de búsqueda.

## Modelos

```ts
export interface Plan {
  id: number;
  insurer_id: number;
  code: string;
  acronym?: string;
  name: string;
  description?: string;
}

export interface Insurer {
  id: number;
  code: string;
  name: string;
  acronym: string;
  insurer_type_name: string;
  plans: Plan[];
}
```

## API del componente

Selector: `app-insurer-plan-selector`

Inputs
- `filtrosBusqueda: string[]` (por defecto `['code','acronym','name','insurer_type_name']`)
  - Define los campos visibles y buscables. Para planes se consideran `code`, `acronym`, `name`.

Outputs
- `(insurerSelected): EventEmitter<Insurer | undefined>`
- `(planSelected): EventEmitter<Plan | undefined>`

Métodos públicos
- `setPlanById(id: number): void` Selecciona un plan por id y sincroniza la aseguradora.

## Uso básico

Template:
```html
<app-insurer-plan-selector
  [filtrosBusqueda]="['code','acronym','name','insurer_type_name']"
  (insurerSelected)="onInsurer($event)"
  (planSelected)="onPlan($event)"
></app-insurer-plan-selector>
```

Componente:
```ts
selectedInsurer?: Insurer;
selectedPlan?: Plan;

onInsurer(i?: Insurer) { this.selectedInsurer = i; }
onPlan(p?: Plan) { this.selectedPlan = p; }
```

## Sin código en etiquetas (oculta [CODE])

```html
<app-insurer-plan-selector
  [filtrosBusqueda]="['acronym','name','insurer_type_name']"
  (insurerSelected)="onInsurer($event)"
  (planSelected)="onPlan($event)"
></app-insurer-plan-selector>
```

## Selección programática

```html
<button type="button" (click)="setPlan210()">Seleccionar OSDE 210</button>
<app-insurer-plan-selector #selector
  (insurerSelected)="onInsurer($event)"
  (planSelected)="onPlan($event)"></app-insurer-plan-selector>
```

```ts
@ViewChild('selector') selector?: InsurerPlanSelectorComponent;

setPlan210() { this.selector?.setPlanById(2); }
```

## ¿Cómo obtengo el valor seleccionado?

Usá los outputs `(insurerSelected)` y `(planSelected)`, que emiten cada vez que cambia la selección. No hace falta usar `ngOnChanges` (ese hook aplica a cambios de Inputs; en este componente sólo `filtrosBusqueda` es un Input). Los eventos ya están implementados y emiten valores limpios del tipo `Insurer` y `Plan`.

Si necesitás leer el valor desde el padre en un momento puntual, también podés usar `@ViewChild` y consultar `insurerControl.value` o `planControl.value`. Aun así, la forma recomendada es reaccionar a los outputs.

## Notas de integración

- Requiere PrimeNG 17+ y los estilos de PrimeNG + PrimeIcons cargados globalmente.
- El servicio (`InsurerPlanSelectorService`) retorna datos mockeados con `of(...).pipe(delay(...))`. Para implementación real, inyectá `HttpClient` y construí la URL con `environment.apiUrl`, por ejemplo:
  - `${environment.apiUrl}/v1/insurers/complete/search?active=true`.
- Soporta Angular 16/17/18/19/20 con sintaxis moderna. El template usa `p-autoComplete` con `[dropdown]` para traer sugerencias sin escribir.

## Accesibilidad y UX

- Placeholders descriptivos.
- Sugerencias iniciales (primeras 5) con dropdown o foco.
- Mensaje “No se encontraron resultados” cuando no hay coincidencias.
