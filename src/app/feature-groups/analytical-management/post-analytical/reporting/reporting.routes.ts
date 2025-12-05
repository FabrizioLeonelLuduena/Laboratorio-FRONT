import { Routes } from '@angular/router';

export const REPORTING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/reporting-main/reporting-main.component').then(
        (m) => m.ReportingMainComponent
      ),
    data: {
      breadcrumb: 'Reportes',
      roles: ['BIOQUIMICO', 'ADMINISTRADOR']
    }
  }
];

