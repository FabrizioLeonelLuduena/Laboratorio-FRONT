import { Routes } from '@angular/router';

export const PROCUREMENT_INVENTORY_ROUTES: Routes = [
  {
    path: 'suppliers',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/suppliers/list/suppliers-list.component').then(
            (m) => m.SuppliersListComponent
          )
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./features/suppliers/create/create-supplier.component').then(
            (m) => m.CreateSupplierComponent
          )
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/suppliers/edit/edit-supplier.component').then(
            (m) => m.EditSupplierComponent
          )
      },
      {
        path: ':id/view',
        loadComponent: () =>
          import('./features/suppliers/view/view-supplier.component').then(
            (m) => m.ViewSupplierComponent
          )
      }
    ]
  },
  {
    path: 'purchase-orders',
    loadChildren: () => import('./features/purchase-orders/purchase-orders.routes').then(m => m.PURCHASE_ORDERS_ROUTES)
  },
  {
    path: 'purchase-order-details',
    loadChildren: () => import('./features/purchase-order-details/purchase-order-details.routes').then(m => m.PURCHASE_ORDER_DETAILS_ROUTES)
  },
  {
    path: 'goods-receipts',
    loadChildren: () => import('./features/goods-receipts/goods-receipts.routes').then(m => m.GOODS_RECEIPTS_ROUTES)
  },
  {
    path: 'goods-receipt-details',
    loadChildren: () => import('./features/goods-receipt-details/goods-receipt-details.routes').then(m => m.GOODS_RECEIPT_DETAILS_ROUTES)
  },
  {
    path: 'requests',
    loadChildren: () => import('./features/requests/requests.routes').then(m => m.REQUESTS_ROUTES)
  },
  {
    path: 'reporting',
    loadChildren: () => import('./features/reporting/reporting.routes').then(m => m.REPORTING_ROUTES)
  },
  {
    path: 'detail/:type',
    loadComponent: () =>
      import('./procurement-inventory-home/components/dashboard-detail/dashboard-detail.component').then(
        (m) => m.DashboardDetailComponent
      )
  },
  {
    path: '',
    redirectTo: 'purchase-orders',
    pathMatch: 'full'
  }
];
