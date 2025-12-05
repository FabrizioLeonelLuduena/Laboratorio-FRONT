import { Routes } from '@angular/router';

import { rolesGuard } from '../../shared/guards/roles.guard';

export const PURCHASE_ORDER_DETAILS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [rolesGuard],
    data: { roles: ['MANAGER_STOCK', 'PURCHASE_OPERATOR', 'FACTURISTA'] },
    loadComponent: () => import('./list/purchase-order-details-list.component').then(m => m.PurchaseOrderDetailsListComponent)
  }
];
