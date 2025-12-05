/**
 * Archivo de barril (barrel) para exportar los componentes del módulo de cola
 */

// Componentes
export { QueueStartComponent } from './queue-start/queue-start.component';
export { QueueRegisterComponent } from './queue-register/queue-register.component';

// Servicios
export { QueueService } from './services/queue.service';
export { PrintService } from './services/print.service';

// Modelos
export * from './models/queue.models';

// Rutas
export { QUEUE_ROUTES } from './routes/queue.routes';
