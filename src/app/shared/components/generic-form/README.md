# GenericFormComponent

Formulario **genérico y configurable por JSON**. Construye un `UntypedFormGroup` con
validaciones dinámicas y accesibilidad básica.

## Características

- **Campos soportados**: `text | email | tel | number | select | date | checkbox | textarea | password | url | radio | array | multiselect | divider`.
- **Validaciones**: `required`, `email`, `pattern`, `min/max (number)`, `dateMin/dateMax (date)`, `minSelected/maxSelected (multiselect)`, `minSaved/minItems/maxItems (array)`.
- **Header opcional**: podés ocultar el encabezado con `[showHeader]="false"`. También se soportan separadores `p-divider` como parte de `fields`.
- **Touched en blur**: feedback de error al perder foco.
- **DatePicker** con límites (`minDate`/`maxDate`).
- **Select** con búsqueda opcional (`filter`, `filterBy`, `filterPlaceholder`). (SIN TERMINAR)
- **Addons** de input group izquierdos/derechos (texto opcional).
- **Accesibilidad**: `aria-invalid`, `aria-describedby` hacia el mensaje por campo.
- **Layout**: grilla `.form-grid-2`, cada ítem define `[data-span]` (1..4).
- **Outputs**: `submitForm` (si válido) y `cancel` (resetea al estado inicial).

## Requisitos

- Angular 16+ (probado en 19).
- PrimeNG 17+.
- CSS global del proyecto (se respeta; no agrega estilos globales).
- **Módulos PrimeNG usados**:
  - `ButtonModule`, `InputTextModule`, `InputNumberModule`, `CheckboxModule`,
    `InputGroupModule`, `InputGroupAddonModule`, `SelectModule`,
    `DatePickerModule`, `RadioButtonModule`, `MultiSelectModule`, `TextArea`, `DividerModule`.

## Eventos

- `(submitForm)` → emite el valor plano del formulario (incluye habilitados/inhabilitados con su valor en ese momento).
- `(cancelForm)` → resetea al estado inicial y emite evento void.

## Inputs

- `[fields]` → array de `GenericFormField` (ver contrato más abajo).
- `[title]` → título del formulario (opcional).
- `[showHeader]` → muestra el header con título (default: `true`).
- `[saving]` → deshabilita el formulario y muestra spinner en el botón submit (default: `false`).
- `[showCancel]` → muestra el botón cancelar (default: `true`).
- `[showSubmit]` → muestra el botón submit (default: `true`).
- `[submitLabel]` → texto del botón submit (default: `'Guardar'`).
- `[cancelLabel]` → texto del botón cancelar (default: `'Cancelar'`).
- `[initialValue]` → valor inicial del formulario (default: `{}`).
- `[size]` → tamaño de los inputs (`'sm' | 'md' | 'lg' | 'full'`, default: `'full'`).
- `[maxCols]` → máximo de columnas en la grilla (`2 | 3 | 4`, default: `4`).
- `[showCard]` → muestra el borde del formulario como una card (default: `true`).
- `[showAsterisk]` → muestra los asteriscos de required (default: `true`).

## Contrato del campo (GenericFormField)

### Tipos de campo (GenericFieldType)

| Tipo          | Uso principal                                                                          |
| ------------- | -------------------------------------------------------------------------------------- |
| `text`        | Texto libre corto (nombre, dirección, DNI si no es numérico estricto).                 |
| `email`       | E-mail con validación `Validators.email`.                                              |
| `tel`         | Teléfono; se suele combinar con `pattern`.                                             |
| `number`      | Números enteros/decimales; soporta `min`/`max`.                                        |
| `select`      | Lista desplegable (opcionalmente con búsqueda).                                        |
| `multiselect` | Selección múltiple con filtro opcional, chips/comma y límites de selección             |
| `date`        | Selector de fecha con límites `minDate`/`maxDate`.                                     |
| `checkbox`    | Valor booleano (sí/no).                                                                |
| `textarea`    | Texto largo multilínea; respeta `rows`.                                                |
| `password`    | Contraseña; combinar con `pattern`.                                                    |
| `url`         | URL; combinar con `pattern` (ej: debe comenzar con `http(s)://`).                      |
| `radio`       | Opciones mutuamente excluyentes (una sola selección).                                  |
| `array`       | Lista de grupos de campos (ver sección específica más abajo).                          |
| `divider`     | Separador visual; no crea control; renderiza `p-divider` con etiqueta opcional dentro. |

### Propiedades Base

| Propiedad     | Tipo               | Aplica a                  | Default    | Descripción / ejemplo                                                            |
| ------------- | ------------------ | ------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `name`        | `string`           | Todos                     | —          | Identificador único del control (clave del `FormGroup`).                         |
| `label`       | `string`           | Todos                     | —          | Etiqueta visible del campo. Si `required` es true, se muestra `*`.               |
| `type`        | `GenericFieldType` | Todos                     | —          | Define el tipo de control a renderizar.                                          |
| `placeholder` | `string`           | Inputs, select, date      | `''`       | Texto guía dentro del control.                                                   |
| `hint`        | `string`           | Todos                     | —          | Texto auxiliar (pie fijo del campo).                                             |
| `colSpan`     | `1 \| 2 \| 3 \| 4` | Todos                     | `2`        | Cuántas columnas ocupa en la grilla `.form-grid-2` (3/4 fuerzan ancho completo). |
| `disabled`    | `boolean`          | Todos                     | `false`    | Deshabilita el control desde el inicio.                                          |
| `required`    | `boolean`          | Todos                     | `false`    | Agrega `Validators.required` y muestra `*` en la etiqueta.                       |
| `rows`        | `number`           | `textarea`                | `3`        | Alto inicial del textarea (en filas).                                            |
| `addonLeft`   | `string`           | Inputs con `p-inputgroup` | — (oculto) | Texto en el addon izquierdo (ej: `$`). Solo se muestra si trae valor.            |
| `addonRight`  | `string`           | Inputs con `p-inputgroup` | — (oculto) | Texto en el addon derecho (ej: `kg`, `%`).                                       |

### Configuracion para `select`

| Propiedad                          | Tipo                                         | Default     | Descripción / ejemplo                                                                               |
| ---------------------------------- | -------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `options`                          | `{ label: string; value: any; disabled? }[]` | `[]`        | Opciones del select. `disabled:true` para deshabilitar alguna entrada (útil como separador visual). |
| `filter`(Proximamente)             | `boolean`                                    | `false`     | Activa el buscador en el panel del select.                                                          |
| `filterBy` (Proximamente)          | `string`                                     | `'label'`   | Propiedad/es de opción a filtrar (ej: `'label,value'`).                                             |
| `filterPlaceholder` (Proximamente) | `string`                                     | `'Buscar…'` | Placeholder del input de filtro.                                                                    |

```
{
  name: 'country',
  label: 'País',
  type: 'select',
  required: true,
  filter: true,
  filterBy: 'label',
  filterPlaceholder: 'Buscar país…',
  options: [
    { label: '— Seleccionar —', value: null, disabled: true },
    { label: 'Argentina', value: 'AR' },
    { label: 'Chile', value: 'CL' }
  ]
}

```

### Configuracion para `multiselect`

| Propiedad           | Tipo                                         | Default     | Descripción                                                                                      |
| ------------------- | -------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `options`           | `{ label: string; value: any; disabled? }[]` | `[]`        | Opciones a elegir. `disabled:true` para deshabilitar una opción (se muestra pero no selecciona). |
| `filter`            | `boolean`                                    | `false`     | Habilita el buscador dentro del panel.                                                           |
| `filterBy`          | `string`                                     | `'label'`   | Campos sobre los que filtra (p. ej. `'label,value'`).                                            |
| `filterPlaceholder` | `string`                                     | `'Buscar…'` | Placeholder del input de filtro.                                                                 |
| `display`           | `'chip' \| 'comma'`                          | `'chip'`    | Cómo mostrar los seleccionados en el input (chips o lista separada por comas).                   |
| `maxSelectedLabels` | `number`                                     | `3`         | Máximo de labels visibles antes de mostrar “+N”.                                                 |
| `selectionLimit`    | `number`                                     | —           | **Límite duro** de selección (bloquea seleccionar más).                                          |
| `minSelected`       | `number`                                     | —           | **Mínimo** requerido. Si no se define y `required: true` ⇒ se asume `1`.                         |
| `maxSelected`       | `number`                                     | —           | **Máximo** permitido (validación lógica).                                                        |

```
{
  name: 'tags',
  label: 'Etiquetas',
  type: 'multiselect',
  required: true,         // si no seteás minSelected, asume 1
  minSelected: 1,
  maxSelected: 5,         // validación lógica
  selectionLimit: 5,      // límite duro de interacción
  display: 'chip',
  options: [...],
  messages: {
    required: 'Elegí al menos una etiqueta.',
    maxItems: 'No podés elegir más de 5 etiquetas.'
  }
}

```

### Validaciones numericas(` number` )

| Propiedad | Tipo     | Descripción                       |
| --------- | -------- | --------------------------------- |
| `min`     | `number` | Valida con `Validators.min(min)`. |
| `max`     | `number` | Valida con `Validators.max(max)`. |

```
{ name: 'discount', label: 'Descuento', type: 'number', min: 0, max: 100, addonRight: '%' }
```

### Patrones (`pattern`) en texto/tel/textarea/password/url

| Propiedad | Tipo               | Descripción                              |
| --------- | ------------------ | ---------------------------------------- |
| `pattern` | `string \| RegExp` | Expresión regular para validar el valor. |

```
// Teléfono simple
{ name: 'phone', type: 'tel', pattern: /^[0-9\s()+-]{6,20}$/ }

// Password fuerte
{ name: 'pwd', type: 'password', pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/ }

// URL con http(s)
{ name: 'website', type: 'url', pattern: /^(https?:\/\/)[^\s]+$/i }
```

### Fechas (`date`)

| Propiedad  | Tipo                       | Descripción                                                                |
|------------|----------------------------|----------------------------------------------------------------------------|
| `minDate`  | `Date \| string \| number` | Fecha mínima permitida (se normaliza a “solo día”).                        |
| `maxDate`  | `Date \| string \| number` | Fecha máxima permitida (se normaliza a “solo día”).                        |
| `showTime` | `boolean`                  | Controla si se muestra el selector de hora                                 |
| `hideDate` | `boolean`                  | Controla si se oculta el selector de fecha para dejar visible solo la hora |

```
// Nacimiento: hasta hoy
{ name: 'birthDate', type: 'date', required: true, minDate: '1900-01-01', maxDate: new Date() }

// Turno: desde hoy hasta fin del año siguiente
{ name: 'appointment', type: 'date', minDate: new Date(), maxDate: new Date(new Date().getFullYear()+1, 11, 31) }
```

### Radio (`radio`)

| Propiedad     | Tipo      | Descripción                                                |
| ------------- | --------- | ---------------------------------------------------------- |
| `options`     | `[]`      | Reutiliza el mismo esquema de `select.options`.            |
| `radioInline` | `boolean` | Controla si se muestran en fila; depende del CSS del comp. |

```
{
  name: 'contactPref',
  label: 'Preferencia de contacto',
  type: 'radio',
  required: true,
  options: [
    { label: 'Email', value: 'email' },
    { label: 'Teléfono', value: 'tel' },
    { label: 'WhatsApp', value: 'wa' }
  ]
}
```

### Chips(`chips`) PROXIMAMENTE

| Propiedad        | Tipo      | Default | Descripción                                                         |
| ---------------- | --------- | ------- | ------------------------------------------------------------------- |
| `separator`      | `string`  | —       | Permite alta rápida separando por el caracter indicado (ej: `','`). |
| `addOnBlur`      | `boolean` | `false` | Agregar chip automáticamente al perder foco.                        |
| `allowDuplicate` | `boolean` | `false` | Permitir valores repetidos.                                         |

```
{
  name: 'tags',
  label: 'Tags',
  type: 'chips',
  separator: ',',
  addOnBlur: false,
  allowDuplicate: false
}
### Divider (`divider`)
### Configuración para `divider`
| Propiedad     | Tipo                              | Default       | Descripción                                           |
|---------------|-----------------------------------|---------------|-------------------------------------------------------|
| `align`       | `'left' \| 'center' \| 'right'`   | `'center'`    | Alineación del contenido/label dentro del divider.    |

```

{ name: 'sepDatos', type: 'divider', label: 'Datos principales', colSpan: 4, align: 'left' }

```
### Mensajes personalizados (`messages`)
| Clave      | Se dispara cuando…                    | Ejemplo de mensaje                     |
| ---------- | ------------------------------------- | -------------------------------------- |
| `required` | Falta completar un campo obligatorio. | `"Este campo es obligatorio."`         |
| `email`    | Email no pasa `Validators.email`.     | `"Ingresá un correo válido."`          |
| `pattern`  | No cumple el `pattern`.               | `"Formato inválido."`                  |
| `min`      | Número menor que `min`.               | `"Debe ser mayor o igual a 0."`        |
| `max`      | Número mayor que `max`.               | `"Debe ser menor o igual a 100."`      |
| `dateMin`  | Fecha menor que `minDate`.            | `"La fecha no puede ser anterior a…"`  |
| `dateMax`  | Fecha mayor que `maxDate`.            | `"La fecha no puede ser posterior a…"` |

```

{
name: 'email',
label: 'Correo',
type: 'email',
required: true,
messages: {
required: 'Necesitamos un correo para contactarte.',
email: 'El correo no tiene un formato válido.'
}
}

```
## Notas de uso
- `name` debe ser único en el formulario (clave del `FormGroup`).

- `required` afecta validación y UI (asterisco).

- Para `select` y `radio`, las opciones usan `{ label, value, disabled? }`.

- En `date`, `minDate`/`maxDate` aceptan `Date`, timestamp `number` o `string` ISO/`yyyy-mm-dd`. Se normalizan a “solo día”.

- `addonLeft`/`addonRight` muestran texto en los addons del `inputGroup` solo si traen valor.

- Para validaciones complejas, combiná `pattern` o mensajes custom con las claves de `messages`.

- En caso de utilizar un campo de tipo array, consultar el README de `CollapsableFormComponent` para entender el contrato de los campos internos.

- Los campos de tipo `array` solo se envian al payload si estos fueron guardados
```
