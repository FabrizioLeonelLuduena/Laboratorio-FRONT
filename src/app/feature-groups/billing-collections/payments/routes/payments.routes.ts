import { Routes } from '@angular/router';

export const paymentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../payments-form/payments-form.component').then(
        (c) => c.PaymentsFormComponent
      )
  },
  {
    path: 'qr',
    loadComponent: () =>
      import('src/app/feature-groups/billing-collections/payments/create-qr-order/create-qr-order.component').then(
        (c) => c.CreateQrOrderComponent
      )
  }
];
