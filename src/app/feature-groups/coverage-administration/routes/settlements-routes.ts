import { Routes } from '@angular/router';

import { SettlementNewComponent } from '../settlement/settlement-new/settlement-new.component';
import { SettlementProvidedComponent } from '../settlement/settlement-provided/settlement-provided.component';

export const settlementsRoutes: Routes = [

  {
    path: '',
    redirectTo: 'home',
    data: { breadcrumb: 'Liquidaciones' },
    pathMatch: 'full'
  },
  {
    /**
         * Settlements home route.
         */
    path: 'home',
    data: { breadcrumb: 'Liquidaciones' },
    loadComponent: () =>
      import('../settlement/settlement-home/settlement-home.component').then(
        m => m.SettlementHomeComponent
      )
  },
  {
    /**
         * New settlement route.
         */
    path: 'new',
    component: SettlementNewComponent,
    data: { breadcrumb: 'Nueva Liquidación' }
  },
  {
    /**
         * Settlement provided services route.
         */
    path: 'provided',
    component: SettlementProvidedComponent,
    data: { breadcrumb: 'Prestaciones' }

  }
]

;
