/**
 * Barrel export file for the appointments-results feature module.
 * Provides centralized exports for all public APIs of the module.
 *
 * This module implements a complete appointment configuration and availability system
 * following Angular 20 best practices with standalone components, reactive forms,
 * observables, and comprehensive JSDoc documentation.
 *
 * @example
 * ```typescript
 * // Import specific items
 * import { AppointmentsHomeComponent, AppointmentConfigurationService } from './appointments-results';
 *
 * // Import all models
 * import * as AppointmentModels from './appointments-results';
 * ```
 */

// Components
//export { AppointmentsHomeComponent } from './components/appointments-home/appointments-home.component';
export { ConfigurationListComponent } from './components/configuration-list/configuration-list.component';
export { ConfigurationFormComponent } from './components/configuration-form/configuration-form.component';
//export { AvailabilitySearchComponent } from './components/availability-search/availability-search.component';

// Services
export { AppointmentConfigurationService } from './services/appointment-configuration.service';
export { AppointmentValidators } from './services/appointment-validators.service';
export { NotificationService } from './services/notification.service';
export type { NotificationType, NotificationMessage } from './services/notification.service';

// Models and Types
export * from './models';

// Pipes
export { AppointmentTimePipe } from './pipes/appointment-time.pipe';
export { AppointmentDatePipe } from './pipes/appointment-date.pipe';

// Routes
export { appointmentsResultsRoutes } from './routes/appointments-results.routes';
