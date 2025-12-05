import { Routes } from '@angular/router';

import { rolesGuard } from '../../shared/guards/roles.guard';

export const GOODS_RECEIPT_DETAILS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [rolesGuard],
    data: { roles: ['MANAGER_STOCK', 'PURCHASE_OPERATOR', 'FACTURISTA'] },
    loadComponent: () => import('./list/goods-receipt-details-list.component').then(m => m.GoodsReceiptDetailsListComponent)
  }
];
