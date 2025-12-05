import { Routes } from '@angular/router';

import { canOpenCashGuard } from './can-open-cash.guard';
import { noFacturistaGuard } from './no-facturista.guard';
import { onlyFacturistaGuard } from './only-facturista.guard';

export const cashManagementRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    canActivate: [noFacturistaGuard],
    loadComponent: () =>
      import('../home/home.component').then((c) => c.CashManagementHomeComponent)
  },
  {
    path: 'opening',
    canActivate: [noFacturistaGuard, canOpenCashGuard],
    loadComponent: () =>
      import('../opening/opening.component').then((c) => c.CashOpeningComponent)
  },
  {
    path: 'dashboard',
    canActivate: [noFacturistaGuard],
    loadComponent: () =>
      import('../dashboard/dashboard.component').then((c) => c.CashDashboardComponent)
  },
  {
    path: 'cash-general',
    canActivate: [onlyFacturistaGuard],
    loadChildren: () =>
      import('../../cash-general/cash-general.routes').then((c) => c.cashGeneralRoutes)
  },
  {
    path: 'operations',
    loadComponent: () =>
      import('../cash-form/cash-form.component').then((c) => c.CashFormComponent)
  },
  {
    path: 'deposit',
    redirectTo: 'operations',
    pathMatch: 'full'
  },
  {
    path: 'withdrawal',
    redirectTo: 'operations',
    pathMatch: 'full'
  },
  {
    path: 'closing',
    canActivate: [noFacturistaGuard],
    loadComponent: () =>
      import('../closing/closing.component').then((c) => c.CashClosingComponent)
  }
];
