import { Routes } from '@angular/router';

import { ConfigurationFormComponent } from '../components/configuration-form/configuration-form.component';
import { ConfigurationListComponent } from '../components/configuration-list/configuration-list.component';

/**
 * Routes configuration for the appointments and results feature module.
 *
 * This module provides:
 * - Appointment configuration management for administrators
 * - Availability search and booking for end users
 * - Integration with the appointment configuration API
 *
 * @example
 * ```typescript
 * // In app routing
 * {
 *   path: 'appointments',
 *   loadChildren: () => import('./feature-groups/appointments-results/routes/appointments-results.routes')
 *     .then(m => m.appointmentsResultsRoutes)
 * }
 * ```
 */
export const appointmentsResultsRoutes: Routes = [
  {
    path: '',
    component: ConfigurationListComponent,
    title: 'Gestión de Configuraciones de Turnos',
    data: {
      breadcrumb: 'Configuraciones',
      description: 'Ver y administrar configuraciones de turnos existentes'
    }
  },
  {
    path: 'configuration/new',
    component: ConfigurationFormComponent,
    title: 'Nueva Configuración de Turnos',
    data: {
      breadcrumb: 'Nueva Configuración',
      description: 'Crear nueva configuración de turnos'
    }
  },
  {
    path: 'configuration/edit',
    component: ConfigurationFormComponent,
    title: 'Editar Configuración de Turnos',
    data: {
      breadcrumb: 'Editar Configuración',
      description: 'Modificar configuración de turnos existente'
    }
  },
  {
    path: 'configuration/edit/:id',
    component: ConfigurationFormComponent,
    title: 'Editar Configuración de Turnos',
    data: {
      breadcrumb: 'Editar Configuración',
      description: 'Modificar configuración de turnos existente'
    }
  },

  // Redirect legacy paths
  {
    path: 'configuration',
    redirectTo: '',
    pathMatch: 'full'
  },
  // Redirect any unmatched paths to the main list
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
