import { Routes } from '@angular/router';

/**
 * Collector Module Routes
 * Routes for the payment collection feature
 */
export const collectorRoutes: Routes = [
  {
    path: '',
    redirectTo: 'create',
    pathMatch: 'full'
  },
  {
    path: 'create',
    loadComponent: () =>
      import('../collector/collector.component').then(
        m => m.CollectorComponent
      )
  }
  // TODO: Add list route when list component is created
  // {
  //   path: 'list',
  //   loadComponent: () =>
  //     import('../collector-list/collector-list.component').then(
  //       m => m.CollectorListComponent
  //     )
  // },
  // TODO: Add edit route when needed
  // {
  //   path: 'edit/:id',
  //   loadComponent: () =>
  //     import('../collector/collector.component').then(
  //       m => m.CollectorComponent
  //     )
  // }
];
