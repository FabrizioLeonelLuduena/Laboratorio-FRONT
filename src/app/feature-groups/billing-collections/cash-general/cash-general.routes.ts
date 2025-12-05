import { Routes } from '@angular/router';

export const cashGeneralRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cash-general.component').then((c) => c.CashGeneralComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('../cash-management/cash-form/cash-form.component').then(
        (c) => c.CashFormComponent
      )
  }
];
