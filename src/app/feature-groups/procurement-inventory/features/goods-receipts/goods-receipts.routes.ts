import { Routes } from '@angular/router';

import { rolesGuard } from '../../shared/guards/roles.guard';

export const GOODS_RECEIPTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/goods-receipts-list.component').then(m => m.GoodsReceiptsListComponent)
  },
  {
    path: 'create',
    canActivate: [rolesGuard],
    data: { roles: ['ADMINISTRADOR','MANAGER_STOCK', 'PURCHASE_OPERATOR'] },
    loadComponent: () =>
      import('./create/create-goods-receipt.component').then(m => m.CreateGoodsReceiptComponent)
  },
  {
    path: ':id',
    canActivate: [rolesGuard],
    data: { roles: ['ADMINISTRADOR','MANAGER_STOCK', 'PURCHASE_OPERATOR', 'FACTURISTA'] },
    loadComponent: () => import('./view/view-goods-receipt.component').then(m => m.ViewGoodsReceiptComponent)
  },
  {
    path: ':id/edit',
    canActivate: [rolesGuard],
    data: { roles: ['ADMINISTRADOR','MANAGER_STOCK', 'PURCHASE_OPERATOR', 'FACTURISTA'] },
    loadComponent: () => import('./edit/edit-goods-receipt.component').then(m => m.EditGoodsReceiptComponent)
  },
  {
    path: ':id/return',
    canActivate: [rolesGuard],
    data: { roles: ['ADMINISTRADOR','MANAGER_STOCK', 'PURCHASE_OPERATOR'] },
    loadComponent: () => import('./create-return/create-return.component').then(m => m.CreateReturnComponent)
  }
];
