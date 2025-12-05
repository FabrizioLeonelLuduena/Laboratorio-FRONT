import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/suppliers-list.component').then(
        (m) => m.SuppliersListComponent
      )
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create/create-supplier.component').then(
        (m) => m.CreateSupplierComponent
      )
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./edit/edit-supplier.component').then(
        (m) => m.EditSupplierComponent
      )
  },
  {
    path: ':supplierId/items/create',
    loadComponent: () =>
      import('./create-supplier-item/create-supplier-item.component').then(
        (m) => m.CreateSupplierItemComponent
      )
  }
];
