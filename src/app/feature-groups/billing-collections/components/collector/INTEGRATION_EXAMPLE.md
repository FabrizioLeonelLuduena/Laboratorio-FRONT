# Integración del Componente Collector en un Stepper

## 🆕 Cambios Recientes (Última Actualización)

### Nuevas Características Implementadas

1. **Servicios de Datos**:
   - `AtentionService`: Obtiene datos de atención mockeados
   - `BillingService`: Calcula precios y maneja facturación
   - `PatientService`: Obtiene datos del paciente
   - `CoverageService`: Obtiene datos de cobertura

2. **Carga Dinámica de Datos**:
   - Los datos se cargan automáticamente en el `OnInit` del componente
   - Implementación de lazy loading con spinner
   - Tabla actualizada para mostrar análisis con montos calculados

3. **Nuevos DTOs e Interfaces**:
   - `AnalysisItem`: Interfaz para items de análisis
   - `PricingRequestDto`: Request para cálculo de precios
   - `CalculateItemResultDTO`: Response con cálculos de cobertura
   - `Patient` y `Coverage`: Interfaces para datos de acordeones

4. **Modal de Pago Personalizado**:
   - Modal simplificado con campos específicos
   - Destino de fondo hardcodeado a "Sucursal centro"
   - Opciones limitadas de medios de pago: Efectivo, Transferencia, QR
   - Fecha de pago siempre inicializada con fecha actual

5. **Sistema de IVA Dinámico** ⭐ NUEVO:
   - Selector de IVA en header de tabla con 3 opciones: 0%, 10.5%, 21%
   - IVA requerido para validación (placeholder "Seleccione IVA")
   - **Reactividad completa**: Los cálculos se actualizan automáticamente al cambiar IVA
   - Implementado con Angular Signals para reactividad óptima
   - Cálculos del resumen basados en IVA seleccionado
   - Subtotal sin IVA = Suma de `patient_amount` de items seleccionados
   - IVA = Subtotal × (% IVA / 100)
   - Total a Pagar = Subtotal sin IVA + IVA
   - Campo "Total Items" eliminado del resumen

6. **Lógica de Pagos en Efectivo** ⭐ NUEVO:
   - Al agregar múltiples pagos en Efectivo, los montos se **suman automáticamente**
   - Solo existe un registro de Efectivo en la tabla de pagos
   - Notificación Toast (3 segundos) al actualizar monto de Efectivo
   - Ejemplo: Efectivo $500 + Efectivo $300 = **Efectivo $800**

7. **UI/UX Mejorada**:
   - Spinner de carga durante peticiones a servicios
   - Botón "Validar" deshabilitado hasta que:
     - La tabla cargue completamente
     - Se seleccione un IVA
     - Haya al menos 1 item seleccionado
     - El pago esté completo
   - Acordeones de PACIENTE y COBERTURA con datos dinámicos
   - Campo "Coseguro" oculto (manteniendo cálculos internos)
   - Toast notification system para feedback al usuario

## 📍 Rutas Configuradas

El componente collector ya está disponible en las siguientes rutas:

- **Ruta base**: `/billing-collections/collector`
- **Crear nuevo cobro**: `/billing-collections/collector/create`

## 🔧 Cómo Integrarlo en un Stepper

### Opción 1: Uso Directo en un Stepper (Recomendado)

```typescript
// parent-stepper.component.ts
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { CollectorComponent } from '../collector/collector.component';

@Component({
  selector: 'app-payment-stepper',
  standalone: true,
  imports: [
    CommonModule,
    StepsModule,
    CollectorComponent  // Importar directamente el componente
  ],
  template: `
    <div class="stepper-container">
      <!-- PrimeNG Stepper -->
      <p-steps
        [model]="steps"
        [(activeIndex)]="activeStepIndex"
        [readonly]="false"
      ></p-steps>

      <!-- Step Content -->
      <div class="step-content">

        <!-- Step 1: Datos del Paciente -->
        <div *ngIf="activeStepIndex === 0">
          <!-- Tu componente de datos del paciente aquí -->
        </div>

        <!-- Step 2: Collector (Cobro) -->
        <div *ngIf="activeStepIndex === 1">
          <app-collector
            (validChange)="onCollectorValidChange($event)"
            (dataChange)="onCollectorDataChange($event)"
          ></app-collector>
        </div>

        <!-- Step 3: Confirmación -->
        <div *ngIf="activeStepIndex === 2">
          <!-- Tu componente de confirmación aquí -->
        </div>

      </div>

      <!-- Navegación -->
      <div class="stepper-actions">
        <button
          pButton
          label="Anterior"
          icon="pi pi-arrow-left"
          (click)="previousStep()"
          [disabled]="activeStepIndex === 0"
        ></button>

        <button
          pButton
          label="Siguiente"
          icon="pi pi-arrow-right"
          iconPos="right"
          (click)="nextStep()"
          [disabled]="!canGoNext()"
        ></button>
      </div>
    </div>
  `,
  styles: [`
    .stepper-container {
      padding: 2rem;
    }

    .step-content {
      margin-top: 2rem;
      margin-bottom: 2rem;
    }

    .stepper-actions {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--surface-300);
    }
  `]
})
export class PaymentStepperComponent {
  @ViewChild(CollectorComponent) collectorStep?: CollectorComponent;

  steps: MenuItem[] = [
    { label: 'Datos del Paciente' },
    { label: 'Cobro' },
    { label: 'Confirmación' }
  ];

  activeStepIndex = 0;

  // Estado de validación del collector
  collectorValid = false;
  collectorData: any = null;

  /**
   * Manejar cambios de validez del collector
   */
  onCollectorValidChange(isValid: boolean): void {
    this.collectorValid = isValid;
    console.log('Collector válido:', isValid);
  }

  /**
   * Manejar cambios de datos del collector
   */
  onCollectorDataChange(data: any): void {
    this.collectorData = data;
    console.log('Datos del collector:', data);
  }

  /**
   * Navegar al siguiente paso
   */
  nextStep(): void {
    if (this.activeStepIndex === 1) {
      // Validar el collector antes de avanzar
      if (this.collectorStep?.validateForm()) {
        this.activeStepIndex++;
      }
    } else {
      this.activeStepIndex++;
    }
  }

  /**
   * Navegar al paso anterior
   */
  previousStep(): void {
    this.activeStepIndex = Math.max(this.activeStepIndex - 1, 0);
  }

  /**
   * Verificar si se puede avanzar
   */
  canGoNext(): boolean {
    switch (this.activeStepIndex) {
      case 0:
        // Validar paso 1 (datos del paciente)
        return true; // Reemplazar con tu lógica
      case 1:
        // Validar paso 2 (collector)
        return this.collectorValid;
      case 2:
        return false; // Último paso
      default:
        return false;
    }
  }
}
```

### Opción 2: Uso con ViewChild y Método Programático

```typescript
// Acceder al componente y validarlo programáticamente
@ViewChild(CollectorComponent) collectorStep!: CollectorComponent;

validateCollectorStep(): boolean {
  return this.collectorStep?.validateForm() || false;
}

getCollectorData(): any {
  return {
    patient: this.collectorStep?.headerForm.value.patient,
    coverage: this.collectorStep?.headerForm.value.coverage,
    items: this.collectorStep?.items(),
    paymentMethods: this.collectorStep?.paymentMethods(),
    totals: {
      total: this.collectorStep?.grandTotal(),
      paid: this.collectorStep?.totalPaid()
    }
  };
}
```

### Opción 3: Uso como Ruta en un RouterOutlet

Si prefieres usar rutas:

```typescript
// stepper.routes.ts
export const stepperRoutes: Routes = [
  {
    path: 'payment-process',
    component: PaymentProcessComponent,
    children: [
      {
        path: 'patient-data',
        loadComponent: () => import('./patient-data/patient-data.component')
          .then(m => m.PatientDataComponent)
      },
      {
        path: 'collector',
        loadComponent: () => import('../collector/collector.component')
          .then(m => m.CollectorComponent)
      },
      {
        path: 'confirmation',
        loadComponent: () => import('./confirmation/confirmation.component')
          .then(m => m.ConfirmationComponent)
      }
    ]
  }
];

// parent-component.ts
navigateToCollector(): void {
  this.router.navigate(['billing-collections/collector/create']);
}
```

## 📊 Datos Emitidos por el Collector

El componente emite los siguientes datos a través del evento `dataChange`:

```typescript
{
  patient: string,              // Nombre del paciente
  coverage: string,             // Cobertura médica
  applyIVA: boolean,           // Si aplica IVA
  items: AnalysisItem[],       // Items de análisis con cálculos
  paymentMethods: PaymentMethodDetail[], // Formas de pago agregadas
  totals: {
    subtotal: number,          // Subtotal sin IVA
    iva: number,              // Total de IVA
    coinsurance: number,      // Coseguro calculado (oculto en UI)
    total: number,            // Total general
    paid: number,             // Total pagado
    remaining: number         // Monto restante
  }
}
```

### Estructura de AnalysisItem

```typescript
interface AnalysisItem {
  description: string;         // Descripción del análisis (ej: "Hemograma completo")
  total_amount: number;        // Monto total del análisis
  covered_amount: number;      // Monto cubierto por la obra social (70%)
  patient_amount: number;      // Monto que debe pagar el paciente
  selected: boolean;           // Si el item está seleccionado para cobro
}
```

## ✅ Validaciones Requeridas

El componente considera válido cuando se cumplen **TODAS** las siguientes condiciones:

1. ✅ **Formulario de header completo** (paciente y cobertura seleccionados)
2. ✅ **IVA seleccionado** (0%, 10.5% o 21%) ⭐ NUEVO
3. ✅ **Al menos 1 item seleccionado** en la tabla (checkbox marcado)
4. ✅ **Pago completo** (suma de pagos = total a pagar)
5. ✅ **Datos cargados** (isLoading = false, sin spinner activo)

**Nota**: El botón "Validar" permanece deshabilitado hasta que todas las condiciones se cumplan.

## 🎨 Ajustes de Estilo en el Stepper

Si necesitas ajustar el tamaño dentro del stepper:

```scss
// stepper.component.scss
.step-content {
  app-collector {
    display: block;
    max-width: 100%;

    ::ng-deep .collector-container {
      padding: 0; // Remover padding extra si es necesario
    }
  }
}
```

## 🚀 Ejemplo Completo de Uso

```html
<!-- En tu componente stepper -->
<p-card>
  <p-steps [model]="steps" [(activeIndex)]="activeIndex"></p-steps>

  <div [ngSwitch]="activeIndex" class="step-container">

    <app-collector
      *ngSwitchCase="1"
      (validChange)="onCollectorValidChange($event)"
      (dataChange)="onCollectorDataChange($event)"
    ></app-collector>

  </div>

  <div class="actions">
    <button pButton label="Atrás" (click)="activeIndex = activeIndex - 1"></button>
    <button
      pButton
      label="Siguiente"
      (click)="activeIndex = activeIndex + 1"
      [disabled]="!collectorValid"
    ></button>
  </div>
</p-card>
```

## 📝 Notas Importantes

1. El componente es **standalone**, no necesita ser declarado en ningún módulo
2. Usa **Angular Signals** para reactividad optimizada
3. El slider lateral es **sticky** y se mantendrá visible al hacer scroll
4. Los datos se cargan dinámicamente desde servicios en el `OnInit`
5. El componente sigue el sistema de **3+1 columnas** (items + resumen)
6. La tabla muestra un spinner durante la carga de datos
7. El botón de validar permanece deshabilitado hasta que:
   - La tabla termine de cargar
   - El pago esté completo

## 🗂️ Estructura de Archivos

```
collector/
├── collector.component.ts       # Componente principal
├── collector.component.html     # Template con tabla y acordeones
├── collector.component.scss     # Estilos responsivos
├── INTEGRATION_EXAMPLE.md       # Esta documentación
├── models/
│   └── dtos.ts                 # Todas las interfaces y DTOs
├── services/
│   ├── atention.service.ts     # Servicio de atención (mock)
│   ├── billing.service.ts      # Servicio de facturación (mock)
│   ├── patient.service.ts      # Servicio de paciente (mock)
│   └── coverage.service.ts     # Servicio de cobertura (mock)
└── edit-payment-modal/
    ├── edit-payment-modal.component.ts
    ├── edit-payment-modal.component.html
    └── edit-payment-modal.component.scss
```

## 🔄 Flujo de Carga de Datos

1. **OnInit** del componente se ejecuta
2. Se llama a `AtentionService.get()` para obtener datos de atención
3. Con `insurance_plan_id` y `analysis_ids`, se llama a `BillingService.getCalc()`
4. Los resultados se mapean a `AnalysisItem[]` y se cargan en la tabla
5. En paralelo, se cargan datos de `PatientService` y `CoverageService`
6. Los acordeones se actualizan con los datos obtenidos
7. El spinner desaparece y la tabla se muestra
8. **Usuario selecciona IVA** (0%, 10.5% o 21%) - REQUERIDO para validación
9. El resumen se actualiza automáticamente con los cálculos de IVA

## 💰 Cálculos del Resumen con IVA

El resumen se calcula de la siguiente manera:

```typescript
// Subtotal sin IVA
subtotal = Σ patient_amount (de items seleccionados)

// IVA (basado en % seleccionado)
iva = subtotal × (selectedIVA / 100)

// Total a Pagar
totalAPagar = subtotal + iva

// Ejemplos:
// Si subtotal = $10,000 y IVA seleccionado = 21%
// → iva = $2,100
// → totalAPagar = $12,100

// Si subtotal = $10,000 y IVA seleccionado = 0%
// → iva = $0
// → totalAPagar = $10,000
```

**Campos del Resumen**:
- ✅ **Subtotal (sin IVA)**: Suma de `patient_amount` de items seleccionados
- ✅ **IVA**: Monto calculado según % seleccionado
- ✅ **TOTAL A PAGAR**: Subtotal + IVA
- ✅ **Total Pagado**: Suma de todos los pagos agregados
- ✅ **Restante**: Total a Pagar - Total Pagado
- ❌ **Total Items**: Eliminado (ya no se muestra)
- 🔒 **Coseguro**: Oculto en UI pero se mantiene en cálculos internos

## 🎯 Modificaciones al Modal de Pago

El modal personalizado tiene las siguientes diferencias con el original:

- **Medio de pago**: Solo 3 opciones (Efectivo, Transferencia, QR)
- **Destino fondo**: Siempre "Sucursal centro" (deshabilitado)
- **Banco**: Solo visible para Transferencia, con 2 opciones (MercadoPago, Ualá)
- **Fecha de pago**: Habilitado, siempre con fecha actual por defecto
- **Campos eliminados**: Referencia de transacción, Observaciones, Número de cheque/transferencia

## 💵 Comportamiento Especial de Pagos en Efectivo

Los pagos en **Efectivo** tienen un comportamiento único:

### ✅ Suma Automática de Montos

Cuando se agrega un pago en Efectivo:

1. **Si NO existe** un pago en Efectivo previo:
   - Se agrega normalmente a la tabla de pagos

2. **Si YA existe** un pago en Efectivo:
   - El nuevo monto se **suma** al existente
   - Se muestra notificación Toast (3 segundos): "El monto del pago en efectivo ha sido actualizado"
   - Solo hay **UN** registro de Efectivo en la tabla

### Ejemplo de Flujo:

```
Estado Inicial:
┌─────────────────────────────────┐
│ Tabla de Pagos: VACÍA           │
└─────────────────────────────────┘

Usuario agrega: Efectivo $500
┌─────────────────────────────────┐
│ ✅ Efectivo | $500.00            │
└─────────────────────────────────┘

Usuario agrega: Efectivo $300
┌─────────────────────────────────┐
│ ✅ Efectivo | $800.00  ← SUMADO │
└─────────────────────────────────┘
🔔 Toast: "El monto del pago en efectivo ha sido actualizado"

Usuario agrega: Transferencia $1000
┌─────────────────────────────────┐
│ ✅ Efectivo       | $800.00      │
│ ✅ Transferencia  | $1000.00     │
└─────────────────────────────────┘
Total Pagado: $1,800.00
```

### Otros Métodos de Pago

Los demás métodos (Transferencia, QR, etc.) se agregan normalmente **sin suma automática**. Pueden existir múltiples registros del mismo tipo.

## 🚨 Troubleshooting

### La tabla no carga datos
- Verificar que los servicios estén correctamente importados
- Revisar la consola para errores en las llamadas de servicio
- Confirmar que `isLoading` cambie a `false` después de las peticiones

### El botón validar no se habilita
**Verificar todas estas condiciones**:
1. ✅ `isLoading` sea `false` (datos cargados)
2. ✅ **IVA seleccionado** (no puede ser `null`) ⭐ NUEVO
3. ✅ Al menos un item con checkbox marcado
4. ✅ Pago completo (`isPaymentComplete()`)
5. ✅ Formulario header válido (paciente y cobertura)

**Causa común**: No se seleccionó IVA en el dropdown

### Los acordeones no muestran datos
- Verificar que `patientData()` y `coverageData()` tengan valores
- Confirmar que los servicios de Patient y Coverage estén respondiendo correctamente

### El resumen muestra $0 en IVA
- **Verificar que se haya seleccionado un IVA** en el dropdown
- Si el IVA seleccionado es 0%, es correcto que muestre $0
- Confirmar que `selectedIVA !== null`

### Los cálculos no se actualizan al cambiar IVA
- **Este problema está RESUELTO**: `selectedIVA` ahora usa Signal
- El componente usa computed properties que se actualizan automáticamente
- Si persiste el problema:
  - Verificar en consola si hay errores de Angular
  - Confirmar que `onIVAChange()` se ejecute correctamente
  - Revisar que el binding sea `[ngModel]="selectedIVA()" (ngModelChange)="onIVAChange($event)"`

### Múltiples pagos en Efectivo aparecen en la tabla
- Esto **NO debería ocurrir**. El componente suma automáticamente
- Verificar que el `PaymentMethod.EFECTIVO` enum esté importado correctamente
- Revisar la lógica en el método `addPaymentMethod()`

### La notificación Toast no aparece
- Verificar que `ToastModule` esté importado en el componente
- Confirmar que `MessageService` esté en los providers
- Asegurar que `<p-toast position="top-right"></p-toast>` esté en el HTML

### Todos los items están deseleccionados y el botón sigue habilitado
- Esto **NO debería ocurrir**. La validación verifica `selectedItemsCount() > 0`
- Verificar que los checkboxes estén bindeados correctamente
- Confirmar que el método `onItemSelectionChange()` se ejecute al desmarcar

### Al eliminar un pago, se borran todos los pagos
- **Este problema está RESUELTO**: Ahora cada pago tiene un ID único
- Cada pago se asigna con `id: this.paymentIdCounter++`
- El método `removePaymentMethod()` filtra por ID específico
- Si persiste, verificar que `paymentIdCounter` esté inicializado correctamente

---

## 📚 Casos de Uso Comunes

### Caso 1: Cobro Simple con Efectivo

**Escenario**: Paciente paga en efectivo el 100% de 3 análisis con IVA 21%

**Pasos**:
1. ✅ Componente carga → Spinner aparece
2. ✅ Datos se cargan automáticamente (Paciente, Cobertura, 5 análisis)
3. ✅ Usuario **selecciona IVA 21%** en dropdown
4. ✅ Usuario desmarca 2 análisis (deja solo 3 seleccionados)
5. ✅ Resumen muestra:
   - Subtotal sin IVA: $15,000
   - IVA (21%): $3,150
   - **Total a Pagar: $18,150**
6. ✅ Usuario hace clic en "Agregar Medio de Pago"
7. ✅ Selecciona "Efectivo" → Ingresa $18,150
8. ✅ Guarda → Pago aparece en tabla
9. ✅ Restante: $0.00 → **Botón "Validar" se habilita**
10. ✅ Usuario hace clic en "Validar" → Flujo completo ✓

---

### Caso 2: Cobro Mixto (Efectivo + Transferencia)

**Escenario**: Paciente paga $10,000 en efectivo y $8,150 por transferencia

**Pasos**:
1. ✅ Componente carga, usuario selecciona **IVA 21%**
2. ✅ Total a Pagar: $18,150
3. ✅ Usuario agrega **Efectivo $10,000**
   - Restante: $8,150
4. ✅ Usuario agrega **Transferencia $8,150** (Banco: MercadoPago)
   - Restante: $0.00
5. ✅ **Botón "Validar" se habilita**
6. ✅ Usuario valida → Cobro completo ✓

**Tabla de Pagos**:
```
┌──────────────────┬───────────┐
│ Efectivo         │ $10,000   │
│ Transferencia    │ $8,150    │
├──────────────────┼───────────┤
│ TOTAL PAGADO     │ $18,150   │
└──────────────────┴───────────┘
```

---

### Caso 3: Múltiples Pagos en Efectivo (Suma Automática)

**Escenario**: Cliente realiza varios pagos en efectivo en diferentes momentos

**Pasos**:
1. ✅ Total a Pagar: $18,150 (IVA 21%)
2. ✅ Usuario agrega **Efectivo $5,000**
   - Tabla: Efectivo $5,000
   - Restante: $13,150
3. ✅ Usuario agrega **Efectivo $3,000**
   - 🔔 Toast: "El monto del pago en efectivo ha sido actualizado"
   - Tabla: **Efectivo $8,000** (suma automática)
   - Restante: $10,150
4. ✅ Usuario agrega **Efectivo $10,150**
   - 🔔 Toast: "El monto del pago en efectivo ha sido actualizado"
   - Tabla: **Efectivo $18,150** (suma total)
   - Restante: $0.00
5. ✅ Botón "Validar" habilitado ✓

**Resultado Final**:
```
┌──────────────────┬───────────┐
│ Efectivo         │ $18,150   │ ← UN solo registro
└──────────────────┴───────────┘
```

---

### Caso 4: Cambio de IVA Durante el Proceso

**Escenario**: Usuario cambia el porcentaje de IVA antes de completar el pago

**Pasos**:
1. ✅ Usuario selecciona **IVA 21%**
   - Subtotal: $15,000
   - IVA: $3,150
   - Total: $18,150
2. ✅ Usuario agrega **Efectivo $18,150**
   - Restante: $0.00
3. ❌ Usuario cambia a **IVA 10.5%**
   - Subtotal: $15,000 (igual)
   - IVA: $1,575 (cambió)
   - Total: **$16,575** (nuevo total)
   - Restante: **-$1,575** (sobrepago)
4. ⚠️ **Botón "Validar" deshabilitado** (pago incompleto - hay sobrepago)
5. ✅ Usuario elimina el pago en Efectivo
6. ✅ Usuario agrega **Efectivo $16,575**
7. ✅ Restante: $0.00 → Botón habilitado ✓

---

### Caso 5: Sin IVA (0%)

**Escenario**: Operación exenta de IVA

**Pasos**:
1. ✅ Usuario selecciona **IVA 0%**
   - Subtotal: $15,000
   - IVA: **$0**
   - Total: $15,000
2. ✅ Usuario agrega **QR $15,000**
3. ✅ Restante: $0.00 → Validar ✓

---

## 🎯 Mejores Prácticas

1. **Siempre seleccionar IVA primero**: Evita recalcular pagos si cambia el IVA
2. **Usar "Saldo Restante"**: El botón en el modal auto-completa el monto pendiente
3. **Verificar resumen antes de pagar**: Confirmar que Total a Pagar sea correcto
4. **Efectivo múltiple**: Aprovechar la suma automática para pagos parciales
5. **Validar al final**: Solo hacer clic en "Validar" cuando todo esté completo

---

## 📊 Resumen de Cambios desde Versión Anterior

| Característica | Antes | Ahora |
|----------------|-------|-------|
| Contador de selección | Texto estático | Dropdown de IVA |
| IVA | Hardcodeado 21% | Seleccionable (0%, 10.5%, 21%) |
| Cálculo IVA | Dividido del subtotal | Multiplicado por % seleccionado |
| Total Items | Visible en resumen | ❌ Eliminado |
| Validación | 4 condiciones | 5 condiciones (+ IVA) |
| Pagos Efectivo | Multiple records | ✅ Suma automática |
| Notificaciones | Sin toast | ✅ Toast implementado |
| Coseguro | Visible | 🔒 Oculto (cálculo interno) |

---

## 🔧 Correcciones Técnicas Importantes

### Fix: Eliminación de Pagos Individuales (v1.2)

**Problema identificado**:
- Al intentar eliminar un pago específico, se eliminaban TODOS los pagos
- Causa: Los pagos no tenían IDs únicos asignados

**Solución implementada**:
```typescript
// Agregar contador de IDs
private paymentIdCounter = 1;

// Asignar ID único al agregar pago
private addPaymentMethod(payment: PaymentMethodDetail): void {
  if (payment.paymentMethod === PaymentMethod.EFECTIVO) {
    // Lógica especial para efectivo...
    if (!existingCash) {
      const paymentWithId = { ...payment, id: this.paymentIdCounter++ };
      this.paymentMethods.update(methods => [...methods, paymentWithId]);
    }
  } else {
    // Para otros métodos, asignar ID único
    const paymentWithId = { ...payment, id: this.paymentIdCounter++ };
    this.paymentMethods.update(methods => [...methods, paymentWithId]);
  }
}

// removePaymentMethod ahora funciona correctamente
removePaymentMethod(id: number | undefined): void {
  this.paymentMethods.update(methods => methods.filter(pm => pm.id !== id));
  // Ahora solo elimina el pago con el ID específico
}
```

**Resultado**:
- ✅ Cada pago tiene un ID único (1, 2, 3, ...)
- ✅ Al hacer clic en eliminar, solo se borra el pago seleccionado
- ✅ Los demás pagos permanecen intactos
- ✅ Funciona correctamente con múltiples pagos del mismo tipo

**Ejemplo**:
```
Tabla de Pagos:
┌──────────────────┬───────────┬────┬─────────┐
│ Tipo             │ Monto     │ ID │ Acción  │
├──────────────────┼───────────┼────┼─────────┤
│ Efectivo         │ $5,000    │ 1  │ [🗑️]   │
│ Transferencia    │ $3,000    │ 2  │ [🗑️]   │
│ QR               │ $2,000    │ 3  │ [🗑️]   │
└──────────────────┴───────────┴────┴─────────┘

Usuario hace clic en 🗑️ de Transferencia (ID: 2)
→ Solo se elimina Transferencia
→ Efectivo y QR permanecen
```

---

### Fix: Reactividad del IVA y Validación Completa (v1.1)

**Problemas identificados**:
1. Los cálculos no se actualizaban automáticamente al cambiar el IVA
2. El botón Validar se habilitaba sin IVA seleccionado
3. El botón se habilitaba al agregar pago completo, incluso sin IVA

**Solución implementada**:
```typescript
// ANTES (no reactivo)
selectedIVA: number | null = null;

// AHORA (reactivo con Signal)
selectedIVA = signal<number | null>(null);

// Binding actualizado en HTML
[ngModel]="selectedIVA()"
(ngModelChange)="onIVAChange($event)"

// Método de manejo
onIVAChange(value: number | null): void {
  this.selectedIVA.set(value);
  this.emitValidityStatus();
  this.emitDataChange();
}

// Corrección del botón Validar en HTML
// ANTES: [disabled]="!isPaymentComplete() || isLoading()"
// AHORA: [disabled]="!validateForm()"
```

**validateForm() verifica TODAS las condiciones**:
```typescript
validateForm(): boolean {
  const headerValid = this.headerForm.valid;
  const hasSelectedItems = this.selectedItemsCount() > 0;
  const paymentComplete = this.isPaymentComplete();
  const ivaSelected = this.selectedIVA() !== null; // ✅ CRÍTICO
  const notLoading = !this.isLoading();

  return headerValid && hasSelectedItems && paymentComplete && ivaSelected && notLoading;
}
```

**Resultado**:
- ✅ Los computed properties (`totalIVA()`, `grandTotal()`) ahora se actualizan automáticamente
- ✅ La validación del botón "Validar" funciona correctamente en TODOS los casos
- ✅ El resumen se recalcula instantáneamente al cambiar IVA
- ✅ El botón NUNCA se habilita sin IVA seleccionado, incluso con pago completo
- ✅ Mensajes de estado mejorados que indican exactamente qué falta

### Mensajes de Estado Inteligentes

El componente ahora muestra mensajes específicos según el estado:

| Estado | Mensaje Mostrado |
|--------|------------------|
| Cargando datos | "Cargando datos..." |
| Sin IVA seleccionado | **"Seleccione un IVA"** ⭐ |
| IVA seleccionado, sin items | "Seleccione al menos un item" |
| Falta completar pago | "Complete el pago total" |
| Todo listo, sin validar | "Click en Validar para continuar" |
| Validado | "Listo para continuar al siguiente paso" ✅ |

**Prioridad de mensajes**: Se muestra el primer requisito faltante en orden de importancia.

---

## 📝 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.2 | Última | ✅ Fix: Eliminación individual de pagos (IDs únicos) |
| v1.1 | Anterior | ✅ Fix: Reactividad IVA + Validación completa |
| v1.0 | Inicial | Sistema base con IVA dinámico y suma de efectivo |

---

**Última actualización (v1.2)**: Fix de eliminación de pagos - Ahora cada pago tiene un ID único y se elimina correctamente de forma individual.

---

## 💳 Sistema de Procesamiento de Pagos (v2.1)

### 🆕 Nuevas Características Implementadas

#### 1. **Nuevos DTOs y Enums para Pagos**

```typescript
// Payment DTOs
export interface PaymentRequestDTO {
  attention_id: number;
  details: PaymentDetailRequestDTO[];
  collections: CollectionRequestDTO[];
  iva: number; // Decimal format (0.21, 0.105, 0)
}

export interface PaymentDetailRequestDTO {
  analysis_id: number;
  is_covered: boolean;
  coverage_id: number;
}

export interface CollectionRequestDTO {
  amount: number;
  payment_method: PaymentMethod;
  receipt_number?: string;
  account_id?: number; // 0 for CASH, 1 for TRANSFER/QR
}

export enum PaymentMethod {
  CASH = 'CASH',
  QR = 'QR',
  POSNET = 'POSNET',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TRANSFER = 'TRANSFER'
}

export interface PaymentResponseDTO {
  payment_id: number;
}
```

**⭐ Cambios v2.1**:
- ❌ Eliminado `collection_id` de `CollectionRequestDTO` (no se envía en request)
- ❌ Eliminado `collection_id` de `PaymentResponseDTO` (solo retorna payment_id)
- ✅ `account_id` siempre se envía: 0 para EFECTIVO, 1 para TRANSFERENCIA/QR

#### 2. **CollectorService**

Nuevo servicio para gestionar la creación y finalización de pagos:

**Métodos**:

- `createPayment(request: PaymentRequestDTO): Observable<PaymentResponseDTO[]>`
  - Crea el pago con todos los detalles y colecciones
  - Retorna una lista de PaymentResponseDTO (uno por cada método de pago)
  - **⭐ v2.1**: Cada respuesta solo contiene `payment_id`, el orden coincide con el orden de `collections` en el request

- `completeCollection(paymentId: number): Observable<{ status: string }>`
  - Completa/confirma un pago específico
  - Retorna `{ status: "Éxito" }`

**Implementación Mock**:
```typescript
// Mock data generation
createPayment(paymentRequest: PaymentRequestDTO): Observable<PaymentResponseDTO[]> {
  // The order of responses matches the order of collections in the request
  const responses: PaymentResponseDTO[] = paymentRequest.collections.map(() => ({
    payment_id: this.mockPaymentIdCounter++ // Different payment_id for each collection
  }));
  return of(responses).pipe(delay(1000));
}

completeCollection(paymentId: number): Observable<{ status: string }> {
  return of({ status: 'Éxito' }).pipe(delay(800));
}
```

**⭐ Estrategia de Asociación por Orden (v2.1)**:
- La respuesta retorna solo `payment_id` (sin collection_id)
- La asociación se hace **por orden**:
  - `paymentResponses[0].payment_id` corresponde a `paymentMethods()[0]`
  - `paymentResponses[1].payment_id` corresponde a `paymentMethods()[1]`
  - etc.
- El orden de `paymentResponses` coincide exactamente con el orden de `collections` en el request

#### 3. **Payment Stepper Modal Component**

Modal con stepper que guía el proceso de confirmación de pagos.

**Características**:
- Un step por cada método de pago
- Ordenamiento especial: QR siempre al final
- Eventos configurables: `onStepLoad` y `onStepComplete`
- UI diferenciada por tipo de pago:
  - **EFECTIVO**: Ícono de espera + botón "Continuar/Aceptar"
  - **TRANSFERENCIA**: Ícono de espera + botón "Continuar/Aceptar"
  - **QR**: Espacio reservado para QR code + sin botón (finaliza automáticamente)

**Step Interface**:
```typescript
export interface PaymentStep {
  payment_id: number;
  paymentMethod: UIPaymentMethod;
  amount: number;
  label: string;
  onStepLoad?: () => void;      // Se ejecuta al cargar el step
  onStepComplete?: () => void;  // Se ejecuta al presionar continuar/aceptar
}
```

**⭐ v2.1**: Eliminado `collection_id` del PaymentStep (solo usa payment_id)

**Comportamiento de Steps**:
```
Step 1: Efectivo $10,000
┌─────────────────────────────────┐
│ 💵 Efectivo                     │
│ Monto: $10,000.00              │
│                                 │
│     [⏱️ Esperando...]          │
│                                 │
│               [Continuar] →    │
└─────────────────────────────────┘

Step 2: Transferencia $5,000
┌─────────────────────────────────┐
│ 📤 Transferencia               │
│ Monto: $5,000.00               │
│                                 │
│     [⏱️ Esperando...]          │
│                                 │
│               [Continuar] →    │
└─────────────────────────────────┘

Step 3: QR $3,150 (ÚLTIMO)
┌─────────────────────────────────┐
│ 📱 QR                          │
│ Monto: $3,150.00               │
│                                 │
│     [🔲 QR Code Placeholder]   │
│                                 │
│ "Se completará automáticamente" │
└─────────────────────────────────┘
(Sin botón - finaliza solo)
```

#### 4. **Flujo de Validación y Procesamiento** (Actualizado v2.1)

**Paso 1: Usuario presiona "Validar"**

El botón muestra spinner de carga y al recibir respuesta muestra Toast y redirige:
```typescript
onValidate(): void {
  this.isValidating.set(true); // Spinner activo

  const paymentRequest = this.buildPaymentRequest();
  this.collectorService.createPayment(paymentRequest).subscribe({
    next: (responses) => {
      this.isValidating.set(false);

      // ⭐ v2.1: Show success toast (10 seconds)
      this.messageService.add({
        severity: 'success',
        summary: 'Factura realizada con éxito',
        detail: 'La factura se ha generado correctamente',
        life: 10000
      });

      // ⭐ v2.1: Redirect to dashboard
      setTimeout(() => {
        this.router.navigate(['/billing-collections/dashboard']);
      }, 500);

      // v2.0: Open stepper modal (COMMENTED - Not used in v2.1)
      // this.openPaymentStepperModal(responses);
    }
  });
}
```

**⭐ Cambios en v2.1**:
- ✅ Muestra Toast de éxito con duración de 10 segundos
- ✅ Redirige a `/billing-collections/dashboard` después de 500ms
- ⚠️ El modal stepper NO se abre (código comentado, mantenido para uso futuro)

**Paso 2: Construcción de PaymentRequestDTO**

```typescript
buildPaymentRequest(): PaymentRequestDTO {
  return {
    attention_id: this.atentionResponse.attention_id,

    // Details: uno por cada item seleccionado
    details: selectedItems.map(item => ({
      analysis_id: analysisItem.analysisId,
      is_covered: analysisItem.authorized,
      coverage_id: calcResult?.coverage_id || 0
    })),

    // Collections: uno por cada método de pago (⭐ v2.1: sin collection_id)
    collections: this.paymentMethods().map((pm) => ({
      amount: pm.amount,
      payment_method: this.mapToBackendPaymentMethod(pm.paymentMethod),
      receipt_number: '',
      account_id: (pm.paymentMethod === TRANSFERENCIA || QR) ? 1 : 0  // ⭐ v2.1: 0 en vez de undefined
    })),

    // IVA en decimal (21% → 0.21)
    iva: ivaDecimal
  };
}
```

**⭐ Cambios en v2.1**:
- ❌ No se incluye `collection_id` en el request
- ✅ `account_id` siempre se envía como número: 1 para TRANSFERENCIA/QR, 0 para otros (EFECTIVO)

**Mapeo de Payment Methods**:
```typescript
UI Enum                → Backend Enum
─────────────────────────────────────
EFECTIVO               → CASH
TRANSFERENCIA          → TRANSFER
QR                     → QR
TARJETA_DEBITO         → DEBIT_CARD
TARJETA_CREDITO        → CREDIT_CARD
MERCADO_PAGO           → QR
CHEQUE                 → TRANSFER
OTRO                   → CASH (default)
```

**Paso 3: Apertura del Modal Stepper**

Se crea un step por cada PaymentResponseDTO asociando por orden:

```typescript
openPaymentStepperModal(paymentResponses: PaymentResponseDTO[]): void {
  // ⭐ v2.1: Asociación por orden de arrays
  // paymentResponses[0].payment_id corresponde a paymentMethods()[0]
  // paymentResponses[1].payment_id corresponde a paymentMethods()[1]
  // etc.
  const steps: PaymentStep[] = paymentResponses.map((response, index) => {
    const paymentMethod = this.paymentMethods()[index];

    return {
      payment_id: response.payment_id,
      paymentMethod: paymentMethod.paymentMethod,
      amount: paymentMethod.amount,
      label: this.getPaymentMethodLabel(paymentMethod.paymentMethod),

      // Evento al cargar step
      onStepLoad: () => {
        // ESPECIAL: QR llama completeCollection inmediatamente
        if (paymentMethod.paymentMethod === PaymentMethod.QR) {
          this.collectorService.completeCollection(response.payment_id).subscribe(...);
        }
      },

      // Evento al presionar continuar/aceptar
      onStepComplete: () => {
        // Para EFECTIVO y TRANSFERENCIA
        if (paymentMethod.paymentMethod !== PaymentMethod.QR) {
          this.collectorService.completeCollection(response.payment_id).subscribe(...);
        }
      }
    };
  });

  // Abrir modal
  this.dialogService.open(PaymentStepperModalComponent, {
    header: 'Procesamiento de Pagos',
    width: '700px',
    modal: true,
    dismissableMask: false,
    closable: false,
    data: { steps }
  });
}
```

**Paso 4: Interacción del Usuario con Steps** (⚠️ v2.0 - COMENTADO en v2.1)

> **Nota v2.1**: Esta funcionalidad del stepper modal está **comentada** en el código actual. El flujo ahora muestra Toast y redirige directamente. El código del modal se mantiene para uso futuro.

<details>
<summary>📋 Ver implementación de Steps (v2.0 - No utilizada actualmente)</summary>

**Para EFECTIVO/TRANSFERENCIA**:
1. Step se carga → `onStepLoad()` se ejecuta (solo log)
2. Usuario revisa información
3. Usuario presiona "Continuar" → `onStepComplete()` se ejecuta
4. Se llama `completeCollection(payment_id)`
5. Toast de confirmación: "Pago confirmado - Éxito"
6. Se avanza al siguiente step

**Para QR (ÚLTIMO)**:
1. Step se carga → `onStepLoad()` se ejecuta automáticamente
2. `completeCollection(payment_id)` se llama **inmediatamente**
3. Toast de confirmación: "Pago QR - Éxito"
4. **NO hay botón** - el flujo termina aquí
5. Modal permanece abierto (el usuario puede cerrar manualmente)

</details>

---

### 🔄 Flujo Completo de Ejemplo (v2.1 Actualizado)

**Escenario**: Paciente paga con 3 métodos (Efectivo + Transferencia + QR)

```
1️⃣ Usuario completa el cobro:
   - Items seleccionados: 3 análisis
   - IVA seleccionado: 21%
   - Total a pagar: $18,150
   - Pagos agregados:
     • Efectivo: $10,000
     • Transferencia: $5,000
     • QR: $3,150

2️⃣ Usuario presiona "Validar"
   → Botón muestra spinner
   → createPayment() se ejecuta

3️⃣ createPayment() request enviado (⭐ v2.1):
   {
     attention_id: 1001,
     details: [
       { analysis_id: 101, is_covered: true, coverage_id: 5 },
       { analysis_id: 102, is_covered: true, coverage_id: 5 },
       { analysis_id: 103, is_covered: true, coverage_id: 5 }
     ],
     collections: [
       { amount: 10000, payment_method: "CASH", receipt_number: "", account_id: 0 },        // ⭐ account_id: 0
       { amount: 5000, payment_method: "TRANSFER", receipt_number: "", account_id: 1 },     // ⭐ account_id: 1
       { amount: 3150, payment_method: "QR", receipt_number: "", account_id: 1 }            // ⭐ account_id: 1
     ],
     iva: 0.21
   }

4️⃣ createPayment() response recibido (⭐ v2.1):
   [
     { payment_id: 1000 },  // ⭐ Solo payment_id, corresponde a collections[0] (Efectivo)
     { payment_id: 1001 },  // ⭐ Solo payment_id, corresponde a collections[1] (Transferencia)
     { payment_id: 1002 }   // ⭐ Solo payment_id, corresponde a collections[2] (QR)
   ]

5️⃣ ⭐ v2.1: Toast de éxito se muestra:
   ┌─────────────────────────────────────────┐
   │ ✅ Factura realizada con éxito          │
   │ La factura se ha generado correctamente │
   │                          [Duración: 10s] │
   └─────────────────────────────────────────┘

6️⃣ ⭐ v2.1: Redirección automática (500ms delay):
   → router.navigate(['/billing-collections/dashboard'])
   → Usuario es redirigido al dashboard
   → Flujo completo ✓
```

**⚠️ Flujo v2.0 (Modal Stepper) - COMENTADO**:
<details>
<summary>Ver flujo anterior con modal stepper (no utilizado en v2.1)</summary>

```
5️⃣ Modal Stepper se abre con steps ordenados:
   [Step 1: Efectivo] → [Step 2: Transferencia] → [Step 3: QR (último)]

6️⃣ Step 1: Efectivo $10,000 (payment_id: 1000)
   → onStepLoad() ejecutado
   → Usuario presiona "Continuar"
   → onStepComplete() ejecutado
   → completeCollection(1000) llamado
   → Toast: "Pago confirmado - Éxito"
   → Avanza al Step 2

7️⃣ Step 2: Transferencia $5,000 (payment_id: 1001)
   → onStepLoad() ejecutado
   → Usuario presiona "Continuar"
   → onStepComplete() ejecutado
   → completeCollection(1001) llamado
   → Toast: "Pago confirmado - Éxito"
   → Avanza al Step 3

8️⃣ Step 3: QR $3,150 (payment_id: 1002) [AUTOMÁTICO]
   → onStepLoad() ejecutado AUTOMÁTICAMENTE
   → completeCollection(1002) llamado INMEDIATAMENTE
   → Toast: "Pago QR - Éxito"
   → NO hay botón
   → Flujo termina
   → Usuario puede cerrar el modal manualmente
```

</details>

---

### 📋 Estructura de Datos Completa

**AtentionResponse** (almacenado en componente):
```typescript
{
  attention_id: 1001,
  insurance_plan_id: 210,
  analysis_ids: [
    { analysisId: 101, authorized: true },
    { analysisId: 102, authorized: true },
    { analysisId: 103, authorized: true }
  ],
  // ... otros campos
}
```

**CalculateItemResultDTO[]** (almacenado en componente):
```typescript
[
  {
    analysis_id: 101,
    coverage_id: 5,
    total_amount: 5000,
    covered_amount: 3500,
    patient_amount: 1500,
    // ... otros campos
  },
  {
    analysis_id: 102,
    coverage_id: 5,
    total_amount: 4000,
    covered_amount: 2800,
    patient_amount: 1200,
    // ... otros campos
  },
  // ...
]
```

**AnalysisItem[]** (mostrados en tabla):
```typescript
[
  {
    description: "Hemograma completo",
    total_amount: 5000,
    covered_amount: 3500,
    patient_amount: 1500,
    selected: true
  },
  // ...
]
```

---

### 🎨 Componentes y Archivos Nuevos

```
collector/
├── services/
│   └── collector.service.ts           # ⭐ NUEVO: Servicio de pagos
├── payment-stepper-modal/             # ⭐ NUEVO: Modal stepper
│   ├── payment-stepper-modal.component.ts
│   ├── payment-stepper-modal.component.html
│   └── payment-stepper-modal.component.scss
└── models/
    └── dtos.ts                        # ACTUALIZADO: Nuevos DTOs de pagos
```

---

### 🔐 Validaciones y Seguridad

**Validación antes de createPayment**:
- ✅ Formulario header válido
- ✅ IVA seleccionado
- ✅ Al menos 1 item seleccionado
- ✅ Pago completo (sin restante)
- ✅ Datos cargados

**Construcción de PaymentRequestDTO**:
- Matching de `analysis_id` entre `AtentionResponse` y `CalculateItemResultDTO`
- `is_covered` tomado de `authorized` field
- `coverage_id` obtenido del resultado de cálculo
- IVA convertido a decimal (21 → 0.21)
- **⭐ v2.1**: `account_id` siempre se envía como número: 0 para EFECTIVO, 1 para TRANSFER/QR

---

### 🔗 Asociación por Orden (v2.1)

**Estrategia de Asociación de Payment IDs**:

Dado que `PaymentResponseDTO` ya no incluye `collection_id`, la asociación entre responses y payment methods se hace **por orden de índice de array**:

```typescript
// Request: collections[] enviado en orden
collections: [
  { amount: 10000, payment_method: "CASH", ... },      // Index 0
  { amount: 5000, payment_method: "TRANSFER", ... },   // Index 1
  { amount: 3150, payment_method: "QR", ... }          // Index 2
]

// Response: paymentResponses[] recibido en el mismo orden
[
  { payment_id: 1000 },  // Index 0 → corresponde a collections[0]
  { payment_id: 1001 },  // Index 1 → corresponde a collections[1]
  { payment_id: 1002 }   // Index 2 → corresponde a collections[2]
]

// Asociación en el código:
paymentResponses.map((response, index) => {
  const paymentMethod = this.paymentMethods()[index];
  // response.payment_id corresponde a paymentMethod
})
```

**Regla clave**: El orden de elementos en `paymentResponses[]` **coincide exactamente** con el orden de `collections[]` en el request, que a su vez coincide con el orden de `paymentMethods()[]`.

> **⚠️ Nota v2.1**: Esta asociación se implementa en el código pero actualmente NO se usa porque el modal stepper está comentado. Se mantiene para uso futuro.

---

### ⚠️ Notas Importantes

1. **⭐ v2.1**: Al validar, muestra Toast "Factura realizada con éxito" (10 segundos)
2. **⭐ v2.1**: Redirige automáticamente a `/billing-collections/dashboard` (500ms delay)
3. **⚠️ v2.1**: Modal stepper NO se abre (código comentado, disponible para uso futuro)
4. **Spinner en botón**: El botón "Validar" muestra spinner durante `createPayment`
5. **Mapeo de enums**: UI PaymentMethod → Backend PaymentMethod
6. **⭐ v2.1**: Asociación por orden de arrays (sin collection_id)
7. **⭐ v2.1**: account_id siempre numérico: 0 para EFECTIVO, 1 para TRANSFER/QR
8. **Payment IDs**: Generados por el servicio (mock: 1000, 1001, 1002, ...)

**Funcionalidades de v2.0 mantenidas pero comentadas**:
- ✅ Orden de Steps: QR SIEMPRE al final
- ✅ QR es especial: No tiene botón, llama `completeCollection` al cargar
- ✅ Modal con confirmación paso a paso
- ⚠️ Código completo disponible en `openPaymentStepperModal()` (comentado)

---

### 🚨 Troubleshooting del Sistema de Pagos

#### El modal no se abre después de validar
- Verificar que `createPayment` esté retornando PaymentResponseDTO[]
- Confirmar que `dialogService` esté correctamente importado
- Revisar consola para errores durante el request

#### Los steps no se muestran en orden correcto
- QR debería estar siempre al final
- Otros steps mantienen el orden de `paymentMethods()`
- Verificar método `sortSteps()` en el modal

#### completeCollection no se ejecuta
- Verificar que `onStepLoad` y `onStepComplete` estén asignados correctamente
- Confirmar que `payment_id` sea válido
- Revisar consola para errores del servicio

#### El botón "Validar" no muestra spinner
- Verificar que `isValidating` sea un Signal
- Confirmar binding `[loading]="isValidating()"`
- Asegurar que `isValidating.set(true)` se ejecute antes del request

#### Toast no aparece después de completeCollection
- Verificar que `MessageService` esté en providers
- Confirmar que `<p-toast>` esté en el HTML del collector
- Revisar que el subscribe tenga el bloque `next` con `messageService.add()`

#### El modal se cierra automáticamente
- Verificar que `closable: false` esté en la config del modal
- Confirmar que `dismissableMask: false` esté configurado
- El modal debe cerrarse solo cuando el usuario lo cierre manualmente

---

## 📊 Resumen de Cambios (v2.1)

| Característica | v1.2 | v2.0 | v2.1 |
|----------------|------|------|------|
| Botón "Validar" | Emite evento | Llama createPayment → Abre modal | **Toast + Redirect** |
| PaymentRequestDTO | ❌ | ✅ Implementado | ✅ Mejorado |
| CollectorService | ❌ | ✅ Implementado | ✅ Actualizado |
| Payment Stepper Modal | ❌ | ✅ Implementado | ⚠️ Comentado (disponible) |
| `collection_id` en request | N/A | Sí (incremental) | ❌ Eliminado |
| `collection_id` en response | N/A | Sí | ❌ Eliminado |
| Asociación request/response | N/A | Por collection_id | **Por orden de arrays** |
| `account_id` para EFECTIVO | N/A | `undefined` | **0** |
| `account_id` para TRANSFER/QR | N/A | 1 | ✅ 1 |
| Confirmación de pagos | Manual | Stepper guiado | **Toast + Navegación** |
| Toast al validar | ❌ | Solo en errors | **✅ Éxito (10s)** |
| Redirección automática | ❌ | ❌ | **✅ /billing-collections/dashboard** |
| Procesamiento QR | N/A | Automático en modal | ⚠️ No usado (modal comentado) |
| Spinner en validación | ❌ | ✅ Sí | ✅ Sí |
| Mapping de enums | N/A | UI → Backend | ✅ UI → Backend |

---

## 📝 Historial de Versiones (Actualizado)

| Versión | Fecha | Cambios |
|---------|-------|---------|
| **v2.1** | **Última** | ✅ Toast de éxito + Redirección automática, modal stepper comentado |
| v2.0 | Anterior | ✅ Sistema completo de procesamiento de pagos con stepper modal |
| v1.2 | Anterior | ✅ Fix: Eliminación individual de pagos (IDs únicos) |
| v1.1 | Anterior | ✅ Fix: Reactividad IVA + Validación completa |
| v1.0 | Inicial | Sistema base con IVA dinámico y suma de efectivo |

---

**Última actualización (v2.1)**:
- ✅ **Toast de éxito**: "Factura realizada con éxito" (10 segundos) al validar
- ✅ **Redirección automática**: Navega a `/billing-collections/dashboard` tras 500ms
- ⚠️ **Modal stepper comentado**: Código completo mantenido en `openPaymentStepperModal()` para uso futuro
- ✅ Eliminado `collection_id` de request y response
- ✅ Asociación de payment_ids por **orden de arrays**
- ✅ `account_id` siempre numérico: 0 para EFECTIVO, 1 para TRANSFER/QR
