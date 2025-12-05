import { Routes } from '@angular/router';

import { PatientsHomeComponent } from '../pages/patients-home/patients-home.component';


/**
 * Route configuration for the Patients module.
 * Defines the root patients path and its child routes, including list, form, and edit.
 */
export const patientsRoutes: Routes = [
  {
    /**
     * Root path for the patient module.
     * Uses PatientsHomeComponent as the container component for all child routes.
     */
    path: '',
    component: PatientsHomeComponent,
    data: { breadcrumb: 'Gestión de pacientes' },
    children: [
      /**
       * Default redirect.
       * Navigates to "list" when the base patients path is accessed.
       */
      { path: '', pathMatch: 'full', redirectTo: 'list' },

      {
        /**
         * Patients list route.
         * Loads PatientsListComponent lazily when "list" is accessed.
         * Includes route data with the title "Pacientes".
         */
        path: 'list',
        loadComponent: () =>
          import('../pages/patients-list/patients-list.component').then(
            (m) => m.PatientsListComponent
          ),
        data: {
          title: 'Pacientes',
          breadcrumb: 'Listado'
        }
      },

      {
        /**
         * New patient form route.
         * Lazily loads PatientsEditFormComponent in creation mode when "form" is accessed.
         * Route data provides the title "Nuevo paciente".
         */
        path: 'form',
        loadComponent: () =>
          import('../pages/patients-edit-form/patients-edit-form.component')
            .then(m => m.PatientsEditFormComponent),
        data: {
          title: 'Nuevo paciente',
          breadcrumb: 'Crear paciente'
        }
      },
      {
        /**
         * Patient detail route (READ-ONLY).
         * Lazily loads PatientsCardDetailComponent when "detail/:id" is accessed.
         * Includes dynamic parameter ":id" to identify which patient to display.
         * Route data provides the title "Detalle del paciente".
         */
        path: 'detail/:id',
        loadComponent: () =>
          import('../pages/patients-card-detail/patients-card-detail.component')
            .then(m => m.PatientsCardDetailComponent),
        data: {
          title: 'Detalle del paciente',
          breadcrumb: 'Detalle'  // Se puede override con nombre del paciente
        }
      },

      {
        /**
         * Edit patient route.
         * Lazily loads PatientsEditFormComponent when "edit-patient/:id" is accessed.
         * Includes dynamic parameter ":id" to identify which patient is being edited.
         * Route data provides the title "Editar paciente".
         */
        path: 'edit-patient/:id',
        loadComponent: () =>
          import('../pages/patients-edit-form/patients-edit-form.component')
            .then(m => m.PatientsEditFormComponent),
        data: {
          title: 'Editar paciente',
          breadcrumb: 'Editar'  // Se puede override con nombre del paciente
        }
      },

      {
        /**
         * Patient reports route.
         * Lazily loads PatientsReportsComponent when "reports" is accessed.
         * Route data provides the title "Reportes".
         */
        path: 'reports',
        loadComponent: () =>
          import('../pages/patients-reports/patients-reports.component')
            .then(m => m.PatientsReportsComponent),
        data: {
          title: 'Reportes de Pacientes',
          breadcrumb: 'Reportes'
        }
      },
      {
        /**
         * Patient dashboard route.
         * Lazily loads PatientsDashboardComponent when "dashboard" is accessed.
         * Route data provides the title "Dashboard".
         */
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/patients-dashboard/patients-dashboard.component')
            .then(m => m.PatientsDashboardComponent),
        data: {
          title: 'Dashboard de Pacientes',
          breadcrumb: 'Dashboard'
        }
      }

    ]
  }
];
