# GenericAddressFormComponent — Uso rápido

Componente standalone (Angular 17+) para capturar direcciones con Reactive Forms y PrimeNG.

## Props (@Input)
- requiredFields: string[] — Campos obligatorios a renderizar (ej.: ['street','number','province','city','postalCode']).
- optionalFields: string[] — Campos opcionales a renderizar (ej.: ['floor','neighborhood']).
- layout: 'columns' | 'stacked' — Disposición visual. 'columns' (3 columnas) por defecto, 'stacked' (todo apilado).

## Eventos (@Output)
- (addressChange): EventEmitter<FormGroup> — Emite el FormGroup completo ante cambios.

## Ejemplos

Columns (3 columnas):
```html
<app-generic-address-form
  [requiredFields]="['street','number','province','city','postalCode']"
  [optionalFields]="['floor','neighborhood']"
  layout="columns"
  (addressChange)="onAddressChange($event)"
></app-generic-address-form>
```

Stacked (apilado):
```html
<app-generic-address-form
  [requiredFields]="['street','province','city']"
  [optionalFields]="[]"
  layout="stacked"
  (addressChange)="onAddressChange($event)"
></app-generic-address-form>
```

## Notas
- Province y City usan p-select con búsqueda.
- El control de Ciudad se habilita automáticamente al seleccionar una Provincia.
