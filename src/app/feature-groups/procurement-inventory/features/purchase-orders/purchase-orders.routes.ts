import { Routes } from '@angular/router';

export const PURCHASE_ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/purchase-orders-list.component').then(m => m.PurchaseOrdersListComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create/purchase-orders-create.component').then(m => m.PurchaseOrdersCreateComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./edit/purchase-orders-edit.component').then(m => m.PurchaseOrdersEditComponent)
  },
  {
    path: 'view/:id',
    loadComponent: () =>
      import('./view/purchase-orders-view.component').then(m => m.PurchaseOrdersViewComponent)
  }
];

