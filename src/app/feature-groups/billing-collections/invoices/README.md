# Módulo de Facturas (Invoices)

Este módulo implementa la funcionalidad completa de creación y gestión de facturas para el sistema de facturación y cobranzas.

## Estructura del Módulo

```
invoices/
├── domain/                      # Modelos de dominio
│   ├── invoice.model.ts        # Modelo principal de factura
│   ├── invoice-item.model.ts   # Modelo de items
│   ├── invoice-payment.model.ts # Modelo de pagos
│   ├── invoice-kind.enum.ts    # Tipos de factura (A, B, C, etc.)
│   ├── invoice-status.enum.ts  # Estados de factura
│   ├── payment-condition.enum.ts # Condiciones de pago
│   └── payment-type.enum.ts    # Tipos de pago
├── dto/                        # Data Transfer Objects
│   ├── request/
│   │   └── create-invoice-request.dto.ts
│   └── response/
│       └── invoice-response.dto.ts
├── mappers/                    # Transformadores de datos
│   └── invoice.mapper.ts       # Mapper con cálculos automáticos
├── application/                # Servicios de aplicación
│   └── invoice.service.ts      # Servicio principal de facturas
├── view-models/                # Modelos de vista
│   └── invoice-creator.vm.ts  # View model del creador
├── components/                 # Componentes UI
│   └── invoice-creator/       # Componente principal de creación
├── routes/                    # Configuración de rutas
│   └── invoices.routes.ts
└── README.md
```

## Características Principales

### 1. Creación de Facturas Multi-Step

El componente `InvoiceCreatorComponent` implementa un wizard de 4 pasos:

1. **Datos Generales**: Información básica de la factura
2. **Items**: Gestión de items con cálculo automático
3. **Pagos**: Definición de métodos de pago
4. **Vista Previa**: Revisión antes de confirmar

### 2. Cálculo Automático de Totales

El `InvoiceMapper` implementa lógica de cálculo automático:

- Subtotales por item (cantidad × precio)
- Descuentos por item
- IVA por item según alícuota
- Total por item
- Subtotal gravado/no gravado
- IVA total de la factura
- Total general con descuentos globales

### 3. Validaciones de Negocio

- Validación de suma de pagos vs total de factura
- Validación de campos requeridos
- Validación de montos mínimos
- Validación de campos condicionales (banco, cheque, etc.)

### 4. Tipos de Factura Soportados

- Factura A
- Factura B
- Factura C
- Factura E
- Nota de Crédito A, B, C
- Nota de Débito A, B, C

### 5. Métodos de Pago

- Efectivo
- Transferencia
- Cheque (con validación de banco y número)
- Tarjeta de Débito
- Tarjeta de Crédito
- Mercado Pago
- QR

## Uso del Componente

### Crear una Nueva Factura

```typescript
// En el router
this.router.navigate(["/billing-collections/invoices/create"]);
```

### Editar una Factura Existente

```typescript
// Con query param
this.router.navigate(["/billing-collections/invoices/create"], {
  queryParams: { id: invoiceId },
});
```

## API del Servicio

### InvoiceService

```typescript
// Crear factura
createInvoice(invoice: Invoice): Observable<Invoice>

// Obtener factura por ID
getInvoiceById(id: number): Observable<Invoice>

// Listar facturas con paginación
getInvoices(page: number, limit: number, filters?: any): Observable<InvoiceListResponseDto>

// Actualizar factura
updateInvoice(id: number, invoice: Partial<Invoice>): Observable<Invoice>

// Cancelar factura
cancelInvoice(id: number): Observable<Invoice>

// Eliminar factura
deleteInvoice(id: number): Observable<void>

// Obtener por cliente
getInvoicesByCustomer(customerId: string): Observable<Invoice[]>

// Obtener por sesión de caja
getInvoicesBySession(sessionId: string): Observable<Invoice[]>
```

## Modelo de Datos

### Invoice

```typescript
interface Invoice {
  id?: number;
  kind: InvoiceKind;
  description: string;
  status?: InvoiceStatus;
  invoiceDate: string;
  paymentDate: string;
  paymentCondition: PaymentCondition;
  paymentType: PaymentType;
  customerId: string;
  companyId: string;
  currencyId: string;
  invoiceNumberPrefix: string;
  invoiceNumber: string;
  taxableSubtotal: number;
  nonTaxableSubtotal: number;
  totalVat: number;
  grandTotal: number;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  observations?: string;
}
```

### InvoiceItem

```typescript
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountPercentage: number;
  accountPlanId: string;
  unitOfMeasure: string;
}
```

### InvoicePayment

```typescript
interface InvoicePayment {
  paymentMethodId: string;
  accountPlanId: string;
  bank?: string;
  checkNumber?: string;
  validityDate?: string;
  amount: number;
}
```

## Mappers

### InvoiceMapper

Métodos principales:

```typescript
// Calcular totales de un item
calculateItemTotals(item: InvoiceItem): InvoiceItem

// Calcular totales de toda la factura
calculateInvoiceTotals(invoice: Invoice): Invoice

// Validar pagos
validatePayments(invoice: Invoice): { valid: boolean; message?: string }

// Conversiones DTO
toCreateRequestDto(invoice: Invoice): CreateInvoiceRequestDto
fromResponseDto(dto: InvoiceResponseDto): Invoice

// Crear entidades vacías
createEmpty(): Invoice
createEmptyItem(): InvoiceItem
createEmptyPayment(): InvoicePayment
```

## Integración con el Backend

El servicio espera los siguientes endpoints:

- `POST /invoices` - Crear factura
- `GET /invoices/:id` - Obtener factura
- `GET /invoices?page=&limit=` - Listar facturas
- `PUT /invoices/:id` - Actualizar factura
- `POST /invoices/:id/cancel` - Cancelar factura
- `DELETE /invoices/:id` - Eliminar factura
- `GET /invoices/customer/:customerId` - Por cliente
- `GET /invoices/session/:sessionId` - Por sesión

### Headers

El servicio envía automáticamente:

- `X-User-Id`: ID del usuario desde localStorage
- `Authorization`: Bearer token desde localStorage
- `X-User-Roles`: Roles del usuario desde localStorage

## Ejemplo de Uso Completo

```typescript
import { InvoiceService } from "./application/invoice.service";
import { InvoiceMapper } from "./mappers/invoice.mapper";
import { InvoiceKind, PaymentCondition, PaymentType } from "./domain";

// Crear una factura nueva
const invoice = InvoiceMapper.createEmpty();
invoice.kind = InvoiceKind.FACTURA_B;
invoice.description = "Consulta médica";
invoice.customerId = "12831430";
invoice.companyId = "97405";

// Agregar item
const item = InvoiceMapper.createEmptyItem();
item.description = "Consulta médica general";
item.quantity = 1;
item.unitPrice = 100;
item.vatRate = 21;
invoice.items.push(item);

// Agregar pago
const payment = InvoiceMapper.createEmptyPayment();
payment.amount = 121;
payment.accountPlanId = "Cuenta Bancaria";
invoice.payments.push(payment);

// Calcular totales
const invoiceWithTotals = InvoiceMapper.calculateInvoiceTotals(invoice);

// Validar
const validation = InvoiceMapper.validatePayments(invoiceWithTotals);
if (validation.valid) {
  // Crear en el backend
  this.invoiceService.createInvoice(invoiceWithTotals).subscribe({
    next: (createdInvoice) => console.log("Factura creada:", createdInvoice),
    error: (error) => console.error("Error:", error),
  });
}
```

## Próximas Mejoras

- [ ] Componente de lista de facturas
- [ ] Componente de visualización de factura
- [ ] Impresión de facturas (PDF)
- [ ] Integración con AFIP
- [ ] Exportación a diferentes formatos
- [ ] Filtros avanzados de búsqueda
- [ ] Dashboard de facturas
- [ ] Reportes y estadísticas

## Notas Técnicas

- Todos los componentes son standalone
- Usa PrimeNG para UI
- Implementa Signals de Angular para estado reactivo
- Sigue arquitectura Clean Architecture
- Usa FormArray para gestión dinámica de items/pagos
- Implementa lazy loading de rutas
