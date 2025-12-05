# Invoicing Module (Facturador)

## Descripción

Módulo completo de facturación con un stepper de 4 pasos siguiendo la arquitectura Screaming Architecture y los patrones establecidos en el proyecto.

## Estructura del Módulo

```
invoicing/
├── domain/                          # Modelos de dominio y enums
│   ├── billing.model.ts             # Modelo principal de facturación
│   ├── billing-item.model.ts        # Modelo de items de factura
│   ├── payment-method-detail.model.ts # Modelo de medios de pago
│   ├── voucher-type.enum.ts         # Enum tipos de comprobante
│   ├── invoice-type.enum.ts         # Enum tipos de factura (A, B, C, etc.)
│   ├── invoice-status.enum.ts       # Enum estados de factura
│   ├── payment-method.enum.ts       # Enum medios de pago
│   ├── fund-destination.enum.ts     # Enum destinos de fondos
│   └── index.ts                     # Barrel export
│
├── mappers/
│   └── billing.mapper.ts            # Utilidad para cálculos y transformaciones
│
├── application/
│   └── billing.service.ts           # Servicio con signals para state management
│
├── view-models/
│   └── billing-creator.vm.ts        # View model del stepper
│
└── components/
    └── billing-creator/             # Componente padre del stepper
        ├── billing-creator.component.ts
        ├── billing-creator.component.html
        ├── billing-creator.component.scss
        └── steps/                   # Componentes hijos (4 pasos)
            ├── invoice-data-step/              # Paso 1: Datos de factura
            │   ├── invoice-data-step.component.ts
            │   ├── invoice-data-step.component.html
            │   └── invoice-data-step.component.scss
            │
            ├── invoice-items-step/             # Paso 2: Items (solo lectura)
            │   ├── invoice-items-step.component.ts
            │   ├── invoice-items-step.component.html
            │   └── invoice-items-step.component.scss
            │
            ├── totals-step/                    # Paso 3: Totales y percepciones
            │   ├── totals-step.component.ts
            │   ├── totals-step.component.html
            │   └── totals-step.component.scss
            │
            └── payment-methods-step/           # Paso 4: Medios de pago (CRUD)
                ├── payment-methods-step.component.ts
                ├── payment-methods-step.component.html
                ├── payment-methods-step.component.scss
                └── edit-payment-modal/         # Modal para editar pagos
                    ├── edit-payment-modal.component.ts
                    ├── edit-payment-modal.component.html
                    └── edit-payment-modal.component.scss
```

---

## Componentes

### 1. Componente Padre: BillingCreatorComponent

**Responsabilidades:**
- Gestión del estado global del stepper usando Angular signals
- Coordinación de navegación entre pasos
- Validación de pasos antes de avanzar
- Recálculo automático de totales
- Comunicación con el servicio para guardar la factura

**Características principales:**
- Usa `ViewChild` para acceder a métodos de validación de los hijos
- Maneja eventos desde los componentes hijos con `@Output()`
- Propaga datos a los hijos con `@Input()`
- Botones: Guardar, Cancelar, Guardar e Imprimir

---

### 2. Paso 1: InvoiceDataStepComponent

**Formulario con los siguientes campos:**

| Campo | Tipo | Validación | Descripción |
|-------|------|------------|-------------|
| Fecha de Factura | Date | Requerido | Fecha de emisión |
| Tipo de Comprobante | Dropdown | Requerido | Factura, NC, ND, etc. |
| Tipo de Factura | Dropdown | Requerido | Tipo A, B, C, E, M |
| Número de Factura | 2 inputs separados | Requerido, 4 y 8 dígitos | Prefijo (0001) + Número (00000021) |
| Estado | Dropdown | Requerido | Cobrada / Sin Cobrar |
| Descripción | Textarea | Requerido | Descripción de la factura |
| Generar Remito | Checkbox | Opcional | Flag para generar remito |
| Número de Remito | Input | Condicional | Requerido si checkbox activado |

**Características:**
- Validación condicional (número de remito solo si checkbox activado)
- Reactive Forms con validators de Angular
- Mensajes de error personalizados

---

### 3. Paso 2: InvoiceItemsStepComponent

**Tabla de solo lectura con items precargados**

**Columnas:**
- Código
- Descripción
- Depósito
- Importación
- Local
- UM (Unidad de Medida)
- Cantidad
- P. Unit. (Precio Unitario)
- % Descuento
- % IVA
- Subtotal
- Cuenta
- Estado (badge habilitado/deshabilitado)

**Características:**
- Usa `AdvancedTableComponent` compartido
- Cálculos automáticos de totales por item
- Resumen de totales en card separada
- Validación: debe haber al menos 1 item

---

### 4. Paso 3: TotalsStepComponent

**Formulario con totales y percepciones:**

| Campo | Tipo | Editable | Validación |
|-------|------|----------|------------|
| Neto Gravado | Currency | Sí | Requerido, >= 0 |
| Neto No Gravado | Currency | Sí | Requerido, >= 0 |
| Total IVA | Currency | Sí | Requerido, >= 0 |
| Percepción IVA | Currency | No (calculado) | - |
| Percepción IIBB | Currency | Sí | Requerido, >= 0 |
| Tipo Percepción IIBB | Dropdown | Sí | Opcional |
| Total Facturas | Currency | No (desde items) | - |

**Características adicionales:**
- Sección de adjuntar documentación (opcional)
- FileUpload con formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
- Lista de archivos adjuntos con opción de eliminar
- Card de resumen con todos los totales y gran total calculado

---

### 5. Paso 4: PaymentMethodsStepComponent

**Tabla CRUD completa de medios de pago**

**Columnas:**
- Medio de Pago
- Destino Fondo
- Banco
- Número
- Fecha Pago
- Importe
- Acciones (Editar / Eliminar)

**Características:**
- CRUD completo: Crear, Leer, Actualizar, Eliminar
- Modal para agregar/editar medios de pago
- Validación: total de pagos debe = total de factura
- Indicador visual de saldo pendiente
- Botón para autocompletar con saldo restante
- Card resumen con:
  - Total Factura
  - Total Pagos
  - Saldo Pendiente (con indicador visual)

---

### 6. Modal: EditPaymentModalComponent

**Modal para crear/editar medio de pago:**

| Campo | Tipo | Validación |
|-------|------|------------|
| Medio de Pago | Dropdown | Requerido |
| Destino Fondo | Dropdown | Requerido |
| Banco | Dropdown | Condicional (según medio de pago) |
| Número | Input | Condicional (según medio de pago) |
| Fecha de Pago | Date | Requerido |
| Importe | Currency | Requerido, > 0 |
| Referencia de Transacción | Input | Opcional |
| Observaciones | Textarea | Opcional |

**Características:**
- Validadores condicionales según medio de pago seleccionado
- Botón para usar saldo restante automáticamente
- Card informativa con totales
- Labels dinámicos según tipo de pago

---

## Arquitectura y Patrones

### 1. State Management
- Usa **Angular Signals** para reactive state
- `viewModel` signal en componente padre
- Computed signals para valores derivados
- Signals read-only expuestos para componentes hijos

### 2. Comunicación Padre-Hijo
```typescript
// Padre → Hijo (Input)
@Input() billing: Billing;

// Hijo → Padre (Output)
@Output() dataChange = new EventEmitter<Partial<Billing>>();
@Output() validChange = new EventEmitter<boolean>();
```

### 3. Validación
- Cada step tiene un método público `validateForm(): boolean`
- El padre llama a estos métodos usando `ViewChild`
- Validación antes de permitir navegación
- Validación final antes de submit

### 4. Cálculos
Todos centralizados en `BillingMapper`:
```typescript
// Calcular totales de item individual
BillingMapper.calculateItemTotals(item: BillingItem)

// Calcular totales de toda la factura
BillingMapper.calculateBillingTotals(billing: Billing)

// Validar medios de pago
BillingMapper.validatePaymentMethods(billing: Billing)

// Crear instancias vacías
BillingMapper.createEmpty()
BillingMapper.createEmptyItem()
BillingMapper.createEmptyPaymentMethod()
```

### 5. Servicio (BillingService)
- Signals para state: `isLoading`, `error`, `currentBilling`
- Métodos CRUD completos
- Manejo de errores centralizado
- Método mock `getSampleItems()` para desarrollo

---

## Validaciones Implementadas

### Step 1 - Invoice Data
- ✅ Todos los campos requeridos
- ✅ Prefijo: exactamente 4 dígitos
- ✅ Número: exactamente 8 dígitos
- ✅ Número de remito: requerido solo si checkbox activado

### Step 2 - Invoice Items
- ✅ Al menos 1 item requerido
- ✅ Todos los items deben tener código y descripción
- ✅ Cantidad > 0
- ✅ Precio unitario >= 0

### Step 3 - Totals
- ✅ Campos numéricos completos
- ✅ Valores pueden ser 0
- ✅ Adjuntar archivo es opcional

### Step 4 - Payment Methods
- ✅ Al menos 1 medio de pago requerido
- ✅ Total pagos debe = total factura (tolerancia 0.01 por redondeo)
- ✅ Campos condicionales según tipo de pago
- ✅ Importe > 0

---

## Enums y Opciones

### VoucherType (Tipo de Comprobante)
- FACTURA
- NOTA_CREDITO
- NOTA_DEBITO
- RECIBO
- REMITO
- PRESUPUESTO

### InvoiceType (Tipo de Factura)
- TIPO_A
- TIPO_B
- TIPO_C
- TIPO_E
- TIPO_M

### InvoiceStatus (Estado)
- COBRADA
- SIN_COBRAR
- PARCIALMENTE_COBRADA
- ANULADA
- VENCIDA

### PaymentMethod (Medio de Pago)
- EFECTIVO
- TRANSFERENCIA
- CHEQUE
- TARJETA_DEBITO
- TARJETA_CREDITO
- MERCADO_PAGO
- QR
- OTRO

### FundDestination (Destino Fondo)
- CAJA_GENERAL
- CAJA_CHICA
- BANCO_CUENTA_CORRIENTE
- BANCO_CAJA_AHORRO
- INVERSIONES
- OTRO

---

## Integración con API (Preparado)

El servicio está preparado para conectarse con el backend:

```typescript
// Configurar en environment
environment.apiUrl = 'http://api.example.com'

// El servicio usará:
// POST /billing - Crear factura
// GET /billing/:id - Obtener por ID
// GET /billing - Listar con filtros
// PUT /billing/:id - Actualizar
// DELETE /billing/:id - Eliminar
// PATCH /billing/:id/cancel - Anular
```

Los DTOs están mapeados en `BillingMapper`:
- `toCreateRequestDto()` - Frontend → Backend
- `fromResponseDto()` - Backend → Frontend

---

## Rutas Configuradas

Las rutas están configuradas en:
- `billing-collections.routes.ts` - Ruta principal: `/billing-collections/invoicing`
- `invoicing.routes.ts` - Rutas del módulo

### Rutas Disponibles

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/billing-collections/invoicing` | Redirect | Redirige a `/create` |
| `/billing-collections/invoicing/create` | BillingCreatorComponent | Crear nueva factura |

### Cómo Navegar

```typescript
// Desde un componente
constructor(private router: Router) {}

// Ir al creador de facturas
navigateToCreate() {
  this.router.navigate(['/billing-collections/invoicing/create']);
}

// O simplemente
navigateToInvoicing() {
  this.router.navigate(['/billing-collections/invoicing']);
}
```

### Desde el HTML
```html
<a routerLink="/billing-collections/invoicing/create">Nueva Factura</a>
```

---

## Próximos Pasos (TODO)

1. ✅ **Routing**: Rutas agregadas y configuradas
2. **List Component**: Crear componente de listado de facturas
3. **API Integration**: Conectar con backend real
4. **Testing**: Unit tests para cada componente
5. **Print Functionality**: Implementar generación de PDF para impresión
6. **AFIP Integration**: Conectar con servicios de AFIP para CAE/CAI
7. **Permissions**: Agregar guards y permisos por rol

---

## Uso del Componente

```typescript
// En el routing module
{
  path: 'new',
  component: BillingCreatorComponent
}

// Navegar al creador
this.router.navigate(['/billing-collections/invoicing/new']);
```

---

## Dependencias PrimeNG Utilizadas

- StepsModule
- ButtonModule
- CardModule
- InputTextModule
- DropdownModule
- CalendarModule
- InputTextareaModule
- CheckboxModule
- InputNumberModule
- FileUploadModule
- DynamicDialogModule (para modal)
- ConfirmDialogModule (para confirmaciones)
- MessageModule / ToastModule (para notificaciones)

---

## Características Destacadas

✅ **Arquitectura Screaming**: Carpetas por dominio, no por tipo técnico
✅ **State Management Moderno**: Angular Signals en lugar de observables
✅ **Componentización**: Reutilización de AdvancedTableComponent
✅ **Validación Robusta**: Multi-nivel con mensajes claros
✅ **UX Optimizada**:
  - Feedback visual inmediato
  - Cálculos automáticos
  - Autocompletado de saldos
  - Confirmaciones antes de acciones destructivas
✅ **Responsive Design**: Adaptado para mobile y desktop
✅ **Accesibilidad**: Labels, ARIA attributes, keyboard navigation
✅ **Type Safety**: TypeScript strict mode
✅ **Separation of Concerns**: Lógica de negocio en Mapper, presentación en componentes

---

## Mantenimiento y Extensión

Para agregar nuevos campos:
1. Actualizar el modelo en `domain/`
2. Agregar al mapper para cálculos
3. Actualizar el formulario correspondiente
4. Ajustar validaciones si es necesario

Para agregar nuevos enums:
1. Crear enum en `domain/`
2. Crear objeto de labels
3. Agregar al index.ts
4. Usar en dropdowns de componentes

---

## Soporte

Para dudas o issues relacionados con este módulo:
- Revisar la documentación de componentes similares (invoices)
- Consultar los patrones establecidos en el README principal
- Verificar los tests unitarios para ejemplos de uso

---

**Creado por:** Claude Code
**Fecha:** 2025-10-18
**Versión:** 1.0.0
