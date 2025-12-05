# 📊 Logger y Observabilidad Frontend

Sistema completo de logging y monitoreo de performance para Angular.

## ✅ Implementado

### 1. **LoggerService** - Logging Centralizado
Servicio principal para logging con múltiples niveles y envío automático al backend.

### 2. **GlobalErrorHandler** - Manejo Global de Errores
Captura todos los errores de la aplicación (JavaScript y HTTP).

### 3. **LoggingInterceptor** - Logging HTTP Automático
Interceptor que registra todas las peticiones y respuestas HTTP.

### 4. **PerformanceMonitorService** - Monitoreo de Performance
Mide Web Vitals, tiempos de carga y navegación.

---

## 🚀 Uso Básico

### Logging en Componentes

```typescript
import { Component, inject } from '@angular/core';
import { LoggerService } from '../core/logger/logger.service';

@Component({
  selector: 'app-my-component',
  template: `...`
})
export class MyComponent {
  private logger = inject(LoggerService);

  ngOnInit() {
    // Log nivel DEBUG (solo en desarrollo)
    this.logger.debug('Componente inicializado', 'MyComponent');

    // Log nivel INFO
    this.logger.info('Usuario cargó la página', 'MyComponent', {
      userId: 123,
      timestamp: new Date()
    });

    // Log nivel WARN
    this.logger.warn('Operación lenta detectada', 'MyComponent', {
      duration: 5000
    });

    // Log nivel ERROR
    try {
      // ... código que puede fallar
    } catch (error) {
      this.logger.error('Error al procesar datos', 'MyComponent', error);
    }
  }
}
```

### Logging en Servicios

```typescript
import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/logger/logger.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private logger = inject(LoggerService);

  loadData() {
    this.logger.info('Cargando datos...', 'DataService');

    return this.http.get('/api/data').pipe(
      tap(data => {
        this.logger.info('Datos cargados exitosamente', 'DataService', {
          count: data.length
        });
      }),
      catchError(error => {
        this.logger.error('Error cargando datos', 'DataService', error);
        return throwError(() => error);
      })
    );
  }
}
```

---

## 📈 Monitoreo de Performance

### Uso Automático
El servicio se inicializa automáticamente y mide:
- ✅ Tiempo de carga de página
- ✅ Web Vitals (LCP, FID, CLS, FCP)
- ✅ Tiempo de navegación entre rutas

### Medir Operaciones Custom

```typescript
import { inject } from '@angular/core';
import { PerformanceMonitorService } from '@core/logger/performance-monitor.service';

export class MyService {
  private perfMonitor = inject(PerformanceMonitorService);

  processData() {
    // Medir operación síncrona
    return this.perfMonitor.measureOperation('processData', () => {
      // ... código a medir
      return result;
    });
  }

  async loadData() {
    // Medir operación asíncrona
    return this.perfMonitor.measureOperation('loadData', async () => {
      const data = await fetch('/api/data');
      return data.json();
    });
  }
}
```

---

## 🔍 Interceptor HTTP

El interceptor se activa automáticamente y registra:
- ✅ Todas las peticiones HTTP salientes
- ✅ Respuestas con status code y duración
- ✅ Errores HTTP con detalles
- ✅ Headers sanitizados (sin tokens/passwords)

**No requiere configuración adicional**, ya está configurado en `app.config.ts`.

---

## 🚨 Manejo de Errores

### Errores Capturados Automáticamente

1. **Errores de JavaScript/TypeScript**
```typescript
// Estos errores son capturados automáticamente
throw new Error('Algo salió mal');
```

2. **Errores HTTP**
```typescript
// Los errores HTTP son capturados por el interceptor y el error handler
this.http.get('/api/data').subscribe();
```

3. **Errores de Angular**
```typescript
// Errores en templates, lifecycle hooks, etc.
```

### Logging Manual de Errores

```typescript
try {
  // código que puede fallar
} catch (error) {
  this.logger.error('Error específico', 'MyComponent', error);
}
```

---

## ⚙️ Configuración

### Niveles de Log

Los niveles se configuran automáticamente según el entorno:

- **Desarrollo**: `DEBUG` (todos los logs)
- **Producción**: `INFO` (solo info, warn, error)

### Envío al Backend

**Actualmente deshabilitado**. Los logs solo se muestran en consola del navegador.

Para habilitar el envío al backend en el futuro:
1. Implementar endpoint `POST /api/logs/frontend` en el backend
2. Descomentar el código en `logger.service.ts` (líneas 103-105)
3. Los logs de nivel `WARN` y `ERROR` se enviarán automáticamente

### Sanitización Automática

Los siguientes campos se ocultan automáticamente:
- `password`
- `token`
- `authorization`
- `apiKey`
- `secret`
- `creditCard`
- `ssn`

---

## 📊 Métricas de Performance

### Web Vitals Monitoreados

| Métrica | Descripción | Valor Bueno |
|---------|-------------|-------------|
| **LCP** | Largest Contentful Paint | < 2.5s |
| **FID** | First Input Delay | < 100ms |
| **CLS** | Cumulative Layout Shift | < 0.1 |
| **FCP** | First Contentful Paint | < 1.8s |

### Obtener Métricas Actuales

```typescript
const perfMonitor = inject(PerformanceMonitorService);
const metrics = perfMonitor.getCurrentMetrics();

console.log('Métricas:', metrics);
// {
//   pageLoadTime: 1234,
//   domContentLoaded: 567,
//   timeToInteractive: 890
// }
```

---

## 🔗 Integración con Backend

### Endpoint de Logs

El proxy debe implementar el endpoint:

```typescript
// proxy-server/server.js
app.post('/api/logs/frontend', (req, res) => {
  const { logs } = req.body;
  
  logs.forEach(log => {
    logger.log({
      level: LogLevel[log.level].toLowerCase(),
      message: log.message,
      context: log.context,
      data: log.data,
      timestamp: log.timestamp,
      sessionId: log.sessionId
    });
  });
  
  res.json({ success: true });
});
```

---

## 🎯 Mejores Prácticas

### 1. Usar Contexto Descriptivo

```typescript
// ✅ Bueno
this.logger.info('Usuario autenticado', 'AuthService', { userId: 123 });

// ❌ Malo
this.logger.info('Success');
```

### 2. Incluir Datos Relevantes

```typescript
// ✅ Bueno
this.logger.error('Error al guardar', 'UserService', {
  userId: user.id,
  action: 'save',
  error: error.message
});

// ❌ Malo
this.logger.error('Error');
```

### 3. Usar el Nivel Apropiado

- `DEBUG`: Información detallada para debugging
- `INFO`: Eventos importantes de la aplicación
- `WARN`: Situaciones anormales pero manejables
- `ERROR`: Errores que requieren atención

### 4. No Loguear en Loops

```typescript
// ❌ Malo
data.forEach(item => {
  this.logger.debug('Processing item', 'Service', item);
});

// ✅ Bueno
this.logger.debug('Processing items', 'Service', { count: data.length });
```

---

## 🔧 Troubleshooting

### Los logs no aparecen en consola

Verifica el nivel de log en `environment.ts`:
```typescript
export const environment = {
  production: false,
  logLevel: LogLevel.DEBUG // Cambiar según necesidad
};
```

### Los logs no se envían al backend

**Nota**: El envío de logs al backend está actualmente deshabilitado. Los logs solo se muestran en la consola del navegador.

### Performance Monitor no funciona

Algunos navegadores no soportan todas las APIs de Performance. Verifica la compatibilidad en [Can I Use](https://caniuse.com/).

---

## 📚 Referencias

- **Observabilidad Backend**: `/observability/README.md`
- **Configuración Proxy**: `/proxy-server/`
- **Web Vitals**: https://web.dev/vitals/
- **Performance API**: https://developer.mozilla.org/en-US/docs/Web/API/Performance

---

## 🎓 Ejemplos Completos

Ver ejemplos de uso en:
- `src/app/core/logger/logger.service.spec.ts`
- `src/app/core/logger/performance-monitor.service.spec.ts`

