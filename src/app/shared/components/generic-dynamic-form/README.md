# GenericDynamicFormComponent

Componente de formulario dinámico mejorado basado en `GenericFormComponent`, con capacidades avanzadas de interacción entre campos.

## 📋 Características

- ✅ **Visibilidad condicional**: Muestra/oculta campos basado en valores de otros campos
- ✅ **Opciones dinámicas**: Actualiza opciones de select según el estado del formulario
- ✅ **Validación cruzada**: Validadores que dependen de múltiples campos
- ✅ **Asterisco dinámico (*)**: Muestra automáticamente el indicador de campo requerido basándose en validaciones dinámicas
- ✅ **Eventos de cambio**: Notifica al componente padre cuando cambian los valores
- ✅ **Signals de Angular 19**: Usa `signal()` y `computed()` para reactividad óptima
- ✅ **Mismo estilo visual**: CSS idéntico a `GenericFormComponent`

## 🆚 Diferencias con GenericFormComponent

| Característica | GenericFormComponent | GenericDynamicFormComponent |
|----------------|----------------------|---------------------------|
| Campos estáticos | ✅ | ✅ |
| Validaciones estáticas | ✅ | ✅ |
| Visibilidad condicional | ❌ | ✅ |
| Opciones dinámicas | ❌ | ✅ |
| Validación cruzada | ❌ | ✅ |
| Eventos de cambio | ❌ | ✅ |
| Dependencias entre campos | ❌ | ✅ |
| Asterisco (*) dinámico | ❌ | ✅ |

**Cuándo usar cada uno:**

- **GenericFormComponent**: Formularios simples sin interacción entre campos
- **GenericDynamicFormComponent**: Formularios complejos con lógica condicional

## 🔧 API - DynamicFormField

Extiende `GenericFormField` con propiedades adicionales:

```typescript
interface DynamicFormField extends GenericFormField {
  // Controla si el campo es visible según el estado del formulario
  visibilityCondition?: (formValue: Record<string, any>) => boolean;

  // Actualiza las opciones de un select dinámicamente
  optionsUpdate?: (formValue: Record<string, any>) => DynamicSelectOption[];

  // Validador que depende de otros campos
  crossFieldValidator?: (formValue: Record<string, any>) => ValidatorFn | null;

  // Nombres de campos de los que depende (para re-validación)
  dependsOn?: string[];
}
```

## 📦 Inputs

```typescript
@Input() fields: DynamicFormField[] = [];        // Configuración de campos
@Input() submitLabel: string = 'Enviar';         // Etiqueta del botón submit
@Input() showCancelButton: boolean = true;       // Mostrar botón cancelar
@Input() cancelLabel: string = 'Cancelar';       // Etiqueta del botón cancelar
@Input() formGrid: number = 1;                   // Columnas del grid (1-4)
```

## 📤 Outputs

```typescript
@Output() formSubmit = new EventEmitter<Record<string, any>>();
@Output() formCancel = new EventEmitter<void>();
@Output() fieldChange = new EventEmitter<FieldChangeEvent>();  // ¡NUEVO!
```

**FieldChangeEvent:**

```typescript
interface FieldChangeEvent {
  fieldName: string;              // Nombre del campo que cambió
  newValue: any;                  // Nuevo valor
  formValue: Record<string, any>; // Estado completo del formulario
}
```

## 📖 Ejemplos de Uso

### 1. Visibilidad Condicional

**Caso:** Solo mostrar campo "Provincia" si el país es "Argentina"

```typescript
fields: DynamicFormField[] = [
  {
    name: 'country',
    label: 'País',
    type: 'select',
    required: true,
    options: [
      { label: 'Argentina', value: 'AR' },
      { label: 'Brasil', value: 'BR' },
      { label: 'Chile', value: 'CL' }
    ]
  },
  {
    name: 'province',
    label: 'Provincia',
    type: 'select',
    required: true,
    options: [
      { label: 'Buenos Aires', value: 'BA' },
      { label: 'Córdoba', value: 'CB' },
      { label: 'Santa Fe', value: 'SF' }
    ],
    // ✨ Solo visible si country === 'AR'
    visibilityCondition: (formValue) => formValue['country'] === 'AR'
  }
];
```

### 2. Opciones Dinámicas

**Caso:** Las ciudades disponibles dependen de la provincia seleccionada

```typescript
fields: DynamicFormField[] = [
  {
    name: 'province',
    label: 'Provincia',
    type: 'select',
    required: true,
    options: [
      { label: 'Buenos Aires', value: 'BA' },
      { label: 'Córdoba', value: 'CB' }
    ]
  },
  {
    name: 'city',
    label: 'Ciudad',
    type: 'select',
    required: true,
    // ✨ Opciones cambian según la provincia
    optionsUpdate: (formValue) => {
      const province = formValue['province'];
      if (province === 'BA') {
        return [
          { label: 'La Plata', value: 'LP' },
          { label: 'Mar del Plata', value: 'MP' }
        ];
      } else if (province === 'CB') {
        return [
          { label: 'Córdoba Capital', value: 'CC' },
          { label: 'Villa María', value: 'VM' }
        ];
      }
      return [];
    }
  }
];
```

### 3. Validación Cruzada

**Caso:** "Fecha de fin" debe ser posterior a "Fecha de inicio"

```typescript
fields: DynamicFormField[] = [
  {
    name: 'startDate',
    label: 'Fecha de Inicio',
    type: 'date',
    required: true
  },
  {
    name: 'endDate',
    label: 'Fecha de Fin',
    type: 'date',
    required: true,
    dependsOn: ['startDate'],  // Re-validar cuando cambie startDate
    // ✨ Validador que compara con startDate
    crossFieldValidator: (formValue) => {
      return (control: AbstractControl): ValidationErrors | null => {
        const start = formValue['startDate'];
        const end = control.value;

        if (!start || !end) return null;

        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();

        if (endTime <= startTime) {
          return {
            dateRange: 'La fecha de fin debe ser posterior al inicio'
          };
        }
        return null;
      };
    }
  }
];
```

### 4. Caso Real: Reactivos (REAGENTS)

**Caso:** Campo "Descripción" obligatorio solo para tipo "Reactivos"

**✨ Comportamiento:**

- Cuando se selecciona "Reactivos", el campo descripción muestra automáticamente el asterisco (*) rojo
- La validación se aplica dinámicamente sin necesidad de código adicional
- El usuario recibe feedback visual inmediato

```typescript
fields: DynamicFormField[] = [
  {
    name: 'supplyType',
    label: 'Tipo de Insumo',
    type: 'select',
    required: true,
    options: [
      { label: 'Reactivos', value: 'REAGENTS' },
      { label: 'Descartables', value: 'DISPOSABLES' },
      { label: 'Maquinaria', value: 'MACHINERY' }
    ]
  },
  {
    name: 'description',
    label: 'Descripción',
    type: 'textarea',
    dependsOn: ['supplyType'],
    // ✨ Requerido dinámicamente con asterisco automático
    crossFieldValidator: (formValue) => {
      return (control: AbstractControl) => {
        const type = formValue['supplyType'];
        if (type === 'REAGENTS') {
          return Validators.required(control);
        }
        return null;
      };
    }
  }
];
```

**Resultado:**

- **Sin tipo seleccionado**: `Descripción` (sin asterisco)
- **Reactivos seleccionado**: `Descripción *` (con asterisco rojo)
- **Otros tipos**: `Descripción` (sin asterisco)

### 5. Escuchar Cambios de Campos

```typescript
export class MyComponent {
  onFieldChange(event: FieldChangeEvent): void {
    console.log(`Campo ${event.fieldName} cambió a:`, event.newValue);
    console.log('Estado completo del form:', event.formValue);

    // Ejemplo: Lógica personalizada
    if (event.fieldName === 'price' && event.newValue > 1000) {
      this.showDiscountField = true;
    }
  }
}
```

```html
<app-generic-dynamic-form
  [fields]="fields"
  (fieldChange)="onFieldChange($event)"
  (formSubmit)="onSubmit($event)"
/>
```

## 🎯 Tipos de Campos Soportados

Todos los tipos de `GenericFormComponent`:

- `text`, `email`, `tel`, `url`, `password`
- `number`
- `select` (con búsqueda incluida)
- `textarea`
- `checkbox`
- `radio`
- `date`
- `chips` (tags múltiples)

## ⚙️ Funcionamiento Interno

1. **Signal de estado**: `formValue = signal({})` rastrea todos los valores
2. **Computed de visibilidad**: `visibleFields()` filtra campos según condiciones
3. **Effect de sincronización**: Actualiza signal cuando cambia `formGroup.value`
4. **handleDynamicUpdates()**:
   - Actualiza opciones de selects dinámicos
   - Re-ejecuta validadores cruzados
   - Re-valida campos dependientes

## 🚀 Ventajas de Usar Signals

- **Performance**: Solo re-renderiza campos visibles que cambiaron
- **Reactividad automática**: Sin `markForCheck()` manual
- **Código declarativo**: Las condiciones se declaran, no se ejecutan
- **Debugging**: Fácil rastrear qué causó un cambio

## 📐 Layout Grid

Igual que `GenericFormComponent`, usa `data-span` en los campos:

```typescript
{
  name: 'fullName',
  label: 'Nombre Completo',
  type: 'text',
  span: 2  // Ocupa 2 columnas en grid de 2
}
```

Configurar grid con:

```html
<app-generic-dynamic-form [formGrid]="2" />
```

## 🧪 Testing

```typescript
it('should hide field when condition is false', () => {
  component.fields = [
    { name: 'country', type: 'select', options: [...] },
    {
      name: 'province',
      type: 'select',
      visibilityCondition: (v) => v['country'] === 'AR'
    }
  ];

  component.formGroup.patchValue({ country: 'BR' });
  fixture.detectChanges();

  const provinceField = fixture.nativeElement.querySelector('[name="province"]');
  expect(provinceField).toBeNull();
});
```

## 🔗 Ver También

- [GenericFormComponent](../generic-form/README.md) - Versión estática
- [AdvancedTableComponent](../advanced-table/README.md) - Tablas dinámicas
- [Supplies Feature](../../../feature-groups/procurement-inventory/README.md) - Uso real

---

**Mantenedor**: LCC Development Team
**Última actualización**: 2025
