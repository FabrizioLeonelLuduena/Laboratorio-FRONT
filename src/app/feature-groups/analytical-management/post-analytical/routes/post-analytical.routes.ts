import { Routes } from '@angular/router';

export const POST_ANALYTICAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../post-analytical-home/post-analytical-home.component').then(m => m.PostAnalyticalHomeComponent),
    data: { breadcrumb: 'Post-Analítica' }
  },
  {
    path: 'reporting',
    loadChildren: () => import('../reporting/reporting.routes').then(m => m.REPORTING_ROUTES),
    data: { breadcrumb: 'Reportes' }
  }
];
