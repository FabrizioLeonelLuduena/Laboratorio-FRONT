{
  path: 'queue',
  loadChildren: () => import('./feature-groups/queue/routes/queue.routes').then(m => m.QUEUE_ROUTES)
}
```

### Endpoints consumidos

- `POST http://localhost:8080/api/v1/queue` - Crear entrada en cola
- `GET http://localhost:8080/api/v1/queue/patient/{publicCode}` - Obtener paciente

## 🎨 Componentes Genéricos Utilizados

- `GenericButtonComponent`: Botones estandarizados del sistema
- `GenericModalComponent`: Modales para confirmaciones y errores
- `GenericAlertComponent`: Alertas visuales dentro de modales

## 📝 Notas Técnicas

- Todos los componentes son **standalone**
- Validación de formularios integrada
- Manejo de estados de carga (loading)
- Responsive design
- Estilos coherentes con el sistema de diseño global

## 🧪 Flujo de Uso

1. Usuario accede a `/queue/start`
2. Selecciona "Con turno" o "Sin turno"
3. Ingresa el DNI del paciente
4. Sistema envía petición y muestra código público
5. Código puede usarse en `/queue/lookup` para consultar estado
# Módulo de Gestión de Cola de Pacientes

Este módulo proporciona una interfaz completa para gestionar la cola de pacientes en el sistema, consumiendo los endpoints del controlador `QueueController` del backend TPI-Appointments.

## 📁 Estructura

```
queue/
├── models/
│   └── queue.models.ts          # DTOs e interfaces
├── services/
│   └── queue.service.ts         # Servicio HTTP para API
├── routes/
│   └── queue.routes.ts          # Configuración de rutas
├── queue-start/                 # Pantalla inicial
│   ├── queue-start.component.ts
│   ├── queue-start.component.html
│   └── queue-start.component.css
├── queue-register/              # Pantalla de registro
│   ├── queue-register.component.ts
│   ├── queue-register.component.html
│   └── queue-register.component.css
└── queue-lookup/                # Pantalla de búsqueda
    ├── queue-lookup.component.ts
    ├── queue-lookup.component.html
    └── queue-lookup.component.css
```

## 🚀 Funcionalidades

### 1. Pantalla de Inicio (`/queue/start`)
- Muestra dos botones principales:
  - **"Con Turno"**: Para pacientes con cita programada
  - **"Sin Turno"**: Para pacientes sin cita
- Usa componentes genéricos del sistema (`GenericButtonComponent`)
- Navegación automática al registro con el parámetro correspondiente

### 2. Pantalla de Registro (`/queue/register`)
- Formulario para ingresar el DNI del paciente
- Envía petición `POST` a `/api/v1/queue` con:
  ```json
  {
    "nationalId": "string",
    "branchId": 1,
    "hasAppointment": true|false
  }
  ```
- Muestra modal de éxito con el **código público** generado
- Manejo de errores con modales informativos

### 3. Pantalla de Búsqueda (`/queue/lookup`)
- Campo de búsqueda por código público
- Consulta `GET` a `/api/v1/queue/patient/{publicCode}`
- Muestra información completa del paciente:
  - DNI
  - Estado en cola
  - Si tiene turno
  - Timestamps de creación y actualización

## 🔌 Integración

### Agregar al sistema de rutas principal

En `app.routes.ts`, agregar:

```typescript

