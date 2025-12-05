# Formulario Genérico para Procurement-Inventory

## 📋 Descripción

Componente genérico altamente configurable para crear formularios reactivos en el dominio de procurement-inventory. Permite crear formularios complejos mediante configuración declarativa sin escribir código repetitivo.

## 🎯 Características

- ✅ **Configuración declarativa**: Define tu formulario mediante objetos de configuración
- ✅ **Múltiples tipos de campos**: text, email, number, textarea, checkbox, select, date, array
- ✅ **Validaciones integradas**: required, minLength, maxLength, pattern, email, validadores personalizados
- ✅ **FormArrays**: Soporte para campos anidados (ej: lista de contactos)
- ✅ **Modos de operación**: Creación, edición y solo lectura
- ✅ **Responsive**: Diseño adaptable con Tailwind CSS
- ✅ **Mensajes de error**: Validación en tiempo real con mensajes personalizables
- ✅ **Campos condicionales**: Muestra campos según el modo (createOnly, editOnly)
- ✅ **Integración PrimeNG**: Usa componentes PrimeNG para una UI consistente

## 📦 Instalación

El componente ya está disponible en:
```
src/app/feature-groups/procurement-inventory/shared/components/generic-form/
```

## 🚀 Uso Básico

### 1. Importar el componente

```typescript
import { GenericProcurementFormComponent } from '../../shared/components/generic-form/generic-procurement-form.component';
```

### 2. Definir la configuración

```typescript
import { GenericFormConfig } from '../../models/form-config.model';

export class MyComponent {
  formConfig: GenericFormConfig = {
    title: 'Mi Formulario',
    sections: [
      {
        title: 'Sección 1',
        icon: 'pi pi-info-circle',
        fields: [
          {
            name: 'campo1',
            label: 'Campo 1',
            type: 'text',
            required: true,
            placeholder: 'Ingrese valor'
          }
        ]
      }
    ]
  };

  onSubmit(data: any) {
    console.log('Datos del formulario:', data);
  }

  onCancel() {
    console.log('Formulario cancelado');
  }
}
```

### 3. Usar en el template

```html
<app-generic-procurement-form
  [config]="formConfig"
  [initialData]="dataToEdit"
  [loading]="isLoading"
  [saving]="isSaving"
  (formSubmit)="onSubmit($event)"
  (formCancel)="onCancel()">
</app-generic-procurement-form>
```

## 📖 Ejemplo Completo: Supplier Form

### Configuración

```typescript
import { 
  CREATE_SUPPLIER_FORM_CONFIG, 
  EDIT_SUPPLIER_FORM_CONFIG,
  getSupplierFormConfig 
} from '../../models/suppliers/supplier-form.config';

export class SupplierFormComponent implements OnInit {
  formConfig!: GenericFormConfig;
  supplierData?: SupplierDetailResponseDTO;
  loading = false;
  saving = false;

  ngOnInit() {
    // Para crear
    this.formConfig = getSupplierFormConfig('create');

    // Para editar
    // this.formConfig = getSupplierFormConfig('edit');
    // this.loadSupplierData(supplierId);
  }

  loadSupplierData(id: number) {
    this.loading = true;
    this.suppliersService.getSupplierById(id).subscribe({
      next: (data) => {
        this.supplierData = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSubmit(formData: any) {
    this.saving = true;
    
    // Para crear
    this.suppliersService.createSupplier(formData).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/suppliers']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  onCancel() {
    this.router.navigate(['/suppliers']);
  }
}
```

### Template

```html
<app-generic-procurement-form
  [config]="formConfig"
  [initialData]="supplierData"
  [loading]="loading"
  [saving]="saving"
  (formSubmit)="onSubmit($event)"
  (formCancel)="onCancel()">
</app-generic-procurement-form>
```

## 🎨 Tipos de Campos

### Text / Email / Phone

```typescript
{
  name: 'company_name',
  label: 'Razón Social',
  type: 'text',
  placeholder: 'Ingrese la razón social',
  icon: 'pi pi-building',
  required: true,
  maxLength: 300,
  helpText: 'Nombre legal de la empresa'
}
```

### Number

```typescript
{
  name: 'quantity',
  label: 'Cantidad',
  type: 'number',
  min: 0,
  max: 9999,
  required: true
}
```

### Textarea

```typescript
{
  name: 'observations',
  label: 'Observaciones',
  type: 'textarea',
  placeholder: 'Comentarios adicionales',
  maxLength: 1000,
  colSpan: 12  // Ocupa toda la fila
}
```

### Checkbox

```typescript
{
  name: 'is_active',
  label: 'Activo',
  type: 'checkbox',
  defaultValue: true
}
```

### Select (Dropdown)

```typescript
{
  name: 'category',
  label: 'Categoría',
  type: 'select',
  required: true,
  options: [
    { label: 'Categoría 1', value: 'cat1' },
    { label: 'Categoría 2', value: 'cat2' }
  ]
}
```

### Date

```typescript
{
  name: 'delivery_date',
  label: 'Fecha de Entrega',
  type: 'date',
  required: true
}
```

### Array (FormArray)

```typescript
{
  name: 'contacts',
  label: 'Contactos',
  type: 'array',
  addButtonLabel: 'Agregar Contacto',
  arrayFields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      colSpan: 6
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      colSpan: 6
    }
  ]
}
```

### CUIT (solo lectura con formato)

```typescript
{
  name: 'cuit',
  label: 'CUIT',
  type: 'cuit',
  icon: 'pi pi-id-card',
  readonly: true
}
```

## ⚙️ Configuración Avanzada

### Validaciones Personalizadas

```typescript
import { AbstractControl } from '@angular/forms';

function phoneValidator(control: AbstractControl) {
  const value = control.value;
  if (!value) return null;
  
  const phoneRegex = /^[+]?[0-9\s\-()]*$/;
  return phoneRegex.test(value) ? null : { invalidPhone: true };
}

// Uso en configuración
{
  name: 'phone',
  label: 'Teléfono',
  type: 'phone',
  customValidator: phoneValidator,
  patternMessage: 'Formato de teléfono inválido'
}
```

### Campos Condicionales

```typescript
// Solo en creación
{
  name: 'cuit',
  label: 'CUIT',
  type: 'text',
  createOnly: true  // Solo se muestra al crear
}

// Solo en edición
{
  name: 'is_active',
  label: 'Activo',
  type: 'checkbox',
  editOnly: true  // Solo se muestra al editar
}
```

### Modo Solo Lectura

```typescript
// Formulario completo readonly
const config: GenericFormConfig = {
  readonly: true,
  showSubmitButton: false,
  showCancelButton: false,
  sections: [...]
};

// Campo individual readonly
{
  name: 'cuit',
  label: 'CUIT',
  type: 'text',
  readonly: true
}
```

### Layout Personalizado

```typescript
{
  name: 'description',
  label: 'Descripción',
  type: 'textarea',
  colSpan: 12,  // Ocupa toda la fila (1-12)
  customClass: 'my-custom-class'
}
```

## 🎨 Personalización de Botones

```typescript
const config: GenericFormConfig = {
  submitButtonLabel: 'Guardar Cambios',
  cancelButtonLabel: 'Volver',
  submitButtonIcon: 'pi pi-save',
  cancelButtonIcon: 'pi pi-arrow-left',
  submitButtonSeverity: 'success',
  showSubmitButton: true,
  showCancelButton: true
}
```

## 📊 Estructura de Datos

### Input: initialData

```typescript
// Datos para poblar el formulario
const supplierData = {
  company_name: 'Tech Solutions S.A.',
  cuit: '30712345678',
  is_active: true,
  observations: 'Proveedor principal',
  contacts: [
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@tech.com',
      phone: '+54 11 1234-5678',
      address: 'Av. Corrientes 1234',
      is_active: true
    }
  ]
};
```

### Output: formSubmit

```typescript
onSubmit(formData: any) {
  // formData contiene todos los valores del formulario
  console.log(formData);
  
  // {
  //   company_name: 'Tech Solutions S.A.',
  //   cuit: '30712345678',
  //   is_active: true,
  //   observations: 'Proveedor principal',
  //   contacts: [
  //     { name: '...', email: '...', ... }
  //   ]
  // }
}
```

## 🔧 API del Componente

### Inputs

| Input | Tipo | Descripción |
|-------|------|-------------|
| `config` | `GenericFormConfig` | **Requerido**. Configuración del formulario |
| `initialData` | `any` | Datos iniciales para poblar el formulario |
| `loading` | `boolean` | Muestra spinner de carga |
| `saving` | `boolean` | Deshabilita botones durante guardado |

### Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `formSubmit` | `EventEmitter<any>` | Emite los datos cuando se envía el formulario |
| `formCancel` | `EventEmitter<void>` | Emite cuando se cancela |
| `formChange` | `EventEmitter<any>` | Emite cada vez que cambia el formulario |

### Métodos Públicos

```typescript
@ViewChild(GenericProcurementFormComponent) 
formComponent!: GenericProcurementFormComponent;

// Resetear formulario
this.formComponent.resetForm();

// Habilitar edición
this.formComponent.enableEdit();

// Deshabilitar edición
this.formComponent.disableEdit();
```

## 📝 Casos de Uso

### 1. Crear Supplier

```typescript
formConfig = CREATE_SUPPLIER_FORM_CONFIG;
```

### 2. Editar Supplier

```typescript
formConfig = EDIT_SUPPLIER_FORM_CONFIG;
supplierData = /* datos del backend */;
```

### 3. Ver Supplier (solo lectura)

```typescript
formConfig = VIEW_SUPPLIER_FORM_CONFIG;
supplierData = /* datos del backend */;
```

### 4. Crear Location

```typescript
// Crear configuración similar a supplier-form.config.ts
const locationFormConfig: GenericFormConfig = {
  title: 'Nueva Ubicación',
  sections: [
    {
      title: 'Datos de Ubicación',
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true },
        { name: 'warehouse', label: 'Almacén', type: 'select', options: [...] },
        { name: 'capacity', label: 'Capacidad', type: 'number', min: 0 }
      ]
    }
  ]
};
```

## 🎓 Mejores Prácticas

1. **Separar configuraciones**: Crea archivos `.config.ts` para cada entidad
2. **Reutilizar constantes**: Usa `ProcurementValidationConstants`
3. **Validadores custom**: Extrae validadores complejos a funciones
4. **Tipos de datos**: Define interfaces para formData
5. **Manejo de errores**: Implementa manejo de errores en submit
6. **Loading states**: Usa `loading` y `saving` para mejor UX

## 🐛 Troubleshooting

### El formulario no se actualiza

```typescript
// Asegúrate de usar OnPush correctamente
constructor(private cdr: ChangeDetectorRef) {}

loadData() {
  this.data = newData;
  this.cdr.markForCheck();  // ← Importante
}
```

### Los validadores no funcionan

```typescript
// Verifica que el validador esté bien definido
customValidator: (control) => {
  return control.value ? null : { required: true };
}
```

### FormArray no se pobla

```typescript
// Asegúrate de que el initialData tenga la estructura correcta
initialData = {
  contacts: [  // ← Array con objetos
    { name: '...', email: '...' }
  ]
}
```

## 📚 Referencias

- [Documentación de Reactive Forms](https://angular.io/guide/reactive-forms)
- [PrimeNG Components](https://primeng.org/components)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contribuir

Para agregar nuevos tipos de campos o features:

1. Actualiza `FormFieldConfig` en `form-config.model.ts`
2. Implementa el renderizado en `generic-procurement-form.component.html`
3. Agrega lógica necesaria en `generic-procurement-form.component.ts`
4. Actualiza esta documentación

---

**Versión**: 1.0.0  
**Última actualización**: Octubre 2025
