import { Routes } from '@angular/router';

/**
 * Invoicing Module Routes
 * Routes for invoice creation and management
 */
export const invoicingRoutes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () =>
      import('../list/invoice-list.component').then(
        m => m.InvoiceListComponent
      )
  },
  {
    path: 'create',
    loadComponent: () =>
      import('../components/billing-creator/billing-creator.component').then(
        m => m.BillingCreatorComponent
      )
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('../components/billing-creator/billing-creator.component').then(
        m => m.BillingCreatorComponent
      )
  }
];
