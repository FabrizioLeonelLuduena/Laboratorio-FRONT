import { Routes } from '@angular/router';

export const billingCollectionsRoutes: Routes = [
  {
    path: 'dashboard-home',
    loadComponent: () =>
      import('../../coverage-administration/coverage-dashboard/coverage-dashboard.component').then(
        (m) => m.CoverageDashboardComponent
      )
  },
  {
    path: 'reports-home',
    data: { breadcrumb: 'Facturación y cobros' },
    loadComponent: () =>
      import('../../coverage-administration/reporting/reporting-home/reporting-home.component').then(
        (m) => m.ReportingHomeComponent
      )
  },
  {
    path: 'settlements',
    data: { breadcrumb: 'Facturación y cobros' },
    loadChildren: () =>
      import('../../coverage-administration/routes/settlements-routes').then(
        (m) => m.settlementsRoutes
      )
  },
  {
    path: 'collector',
    loadChildren: () =>
      import('../components/routes/collector.routes').then(
        (m) => m.collectorRoutes
      )
  },
  {
    path: 'invoice',
    loadComponent: () =>
      import('../components/invoice/invoice.component').then(
        (m) => m.InvoiceComponent
      )
  },
  {
    path: 'invoicing',
    loadChildren: () =>
      import('../invoicing/routes/invoicing.routes').then(
        (m) => m.invoicingRoutes
      )
  },
  {
    path: 'cash-detail/:cashId',
    loadComponent: () =>
      import('../cash-detail/cash-detail-page.component').then(
        (m) => m.CashDetailPageComponent
      )
  },
  {
    path: '',
    loadChildren: () =>
      import('../cash-management/routes/cash-management.routes').then(
        (m) => m.cashManagementRoutes
      )
  }
];
