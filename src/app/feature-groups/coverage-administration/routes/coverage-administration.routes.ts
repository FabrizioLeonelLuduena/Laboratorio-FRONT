import { Routes } from '@angular/router';

import { CoverageDashboardComponent } from '../coverage-dashboard/coverage-dashboard.component';
import { CoverageHomeComponent } from '../coverage-home/coverage-home.component';
import { CoverageStepperComponent } from '../coverage-stepper/coverage-stepper.component';
import { InsurerInfoComponent } from '../insurer-detail/components/insurer-info/insurer-info.component';
import { InsurerDetailComponent } from '../insurer-detail/insurer-detail.component';
import { InsurerTableComponent } from '../insurer-list/insurer-table/insurer-table.component';
import { ReportingHomeComponent } from '../reporting/reporting-home/reporting-home.component';

export const coverageAdministrationRoutes: Routes = [
  {
    /**
     * Root path for the coverage administration module.
     * Uses CoverageHomeComponent as the container component for all child routes.
     */
    path: '',
    component: CoverageHomeComponent,
    data: { breadcrumb: 'Gestión interna' },
    children: [
      /**
       * Default redirect.
       * Navigates to "insurers" when the base coverage-administration path is accessed.
       */
      { path: '', pathMatch: 'full', redirectTo: 'insurers' },

      {
        /**
         * Coverage dashboard route (same structure as Atención dashboard).
         */
        path: 'dashboard',
        component: CoverageDashboardComponent,
        data: { breadcrumb: 'Dashboard' }
      },
      {
        /**
         * Insurers list route.
         */
        path: 'insurers',
        component: InsurerTableComponent,
        data: { breadcrumb: 'Aseguradoras' }
      },
      {
        /**
         * New insurer form route.
         */
        path: 'new',
        component: CoverageStepperComponent,
        data: { breadcrumb: 'Nueva Aseguradora' }
      },
      {
        /**
         * Insurer detail route.
         * Includes dynamic parameter ":id" to identify which insurer to display.
         */
        path: 'insurer/:id',
        component: InsurerDetailComponent,
        data: { breadcrumb: 'Detalle de Aseguradora' }
      },
      {
        /**
         * View insurer route.
         */
        path: 'view-insurer',
        component: InsurerInfoComponent,
        data: { breadcrumb: 'Ver Aseguradora' }
      },
      {
        /**
         * Reports home route.
         */
        path: 'reports-home',
        component: ReportingHomeComponent,
        data: { breadcrumb: 'Reportes' }
      }
    ]
  }
];
