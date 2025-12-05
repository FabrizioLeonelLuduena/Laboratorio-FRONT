import { Routes } from '@angular/router';

import { rolesGuard } from '../../shared/guards/roles.guard';

export const REQUESTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [rolesGuard],
    data: { roles: ['MANAGER_STOCK', 'PURCHASE_OPERATOR', 'FACTURISTA'] },
    loadComponent: () => import('./list/requests-list.component').then(m => m.RequestsListComponent)
  }
];
