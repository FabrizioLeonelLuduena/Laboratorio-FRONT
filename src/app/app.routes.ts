import { Routes } from '@angular/router';

import { manualPageGuard } from './manual/manual-page.guard';
import { manualLayoutGuard } from './manual/manual-layout.guard';
import { HomeDashboardComponent } from './shared/components/home-dashboard/home-dashboard.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './shared/guards/auth.guard';
import { firstLoginGuard } from './shared/guards/first-login.guard';
import { passwordResetGuard } from './shared/guards/password-reset.guard';
import { roleGuard } from './shared/guards/role.guard';

export const routes: Routes = [

  {
    path: 'login',
    loadComponent: () =>
      import('./feature-groups/user-management/pages/internal-user-login/internal-user-login.component').then(
        (m) => m.InternalUserLoginComponent
      )
  },
  {
    path: 'password-recover',
    loadComponent: () =>
      import('./feature-groups/user-management/pages/internal-user-password-recover/internal-user-password-recover.component').then(
        (m) => m.InternalUserPasswordRecoverComponent
      )
  },
  {
    path: 'password-reset',
    canActivate: [passwordResetGuard],
    loadComponent: () =>
      import('./feature-groups/user-management/pages/password-reset/password-reset.component').then(
        (m) => m.PasswordResetComponent
      )
  },
  {
    path: 'email-verification',
    loadComponent: () =>
      import('./feature-groups/user-management/pages/email-verification/email-verification.component').then(
        (m) => m.EmailVerificationComponent
      )
  },
  {
    path: 'queue',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./feature-groups/queue/routes/queue.routes').then((m) => m.QUEUE_ROUTES)
  },
  {
    path: 'manual',
    children: [
      {
        path: '',
        canActivate: [manualLayoutGuard],
        loadComponent: () =>
          import('../app/manual/manual-layout/manual-layout.component')
            .then(m => m.ManualLayoutComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('../app/manual/manual-home/manual-home.component')
                .then(m => m.ManualHomeComponent)
          },
          {
            path: ':moduleId/:pageId',
            canActivate: [manualPageGuard],
            loadComponent: () =>
              import('../app/manual/manual-page/manual-page.component')
                .then(m => m.ManualPageComponent)
          }
        ]
      }
    ]
  },
  {
    path: '',
    canActivate: [authGuard, firstLoginGuard], //protection child routes
    component: LayoutComponent,
    children: [
      {
        path: 'home-dashboard', component: HomeDashboardComponent
      },
      {
        path: 'analytical-management',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'BIOQUIMICO', 'TECNICO_LABORATORIO', 'SECRETARIA', 'FACTURISTA', 'EXTERNO'] },
        loadChildren: () =>
          import('./feature-groups/analytical-management/routes/pre-analytical.routes').then(
            (m) => m.analyticalManagementRoutes
          )
      },
      {
        path: 'billing-collections',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'FACTURISTA'] },
        loadChildren: () =>
          import('./feature-groups/billing-collections/routes/billing-collections.routes').then(
            (m) => m.billingCollectionsRoutes
          )
      },
      {
        path: 'user-management',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'] },
        loadChildren: () =>
          import('./feature-groups/user-management/routes/user-management.routes').then(
            (m) => m.userManagementRoutes
          )
      },
      {
        path: 'coverage-administration',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA', 'SECRETARIA', 'FACTURISTA'] },
        loadChildren: () =>
          import(
            './feature-groups/coverage-administration/routes/coverage-administration.routes'
          ).then((m) => m.coverageAdministrationRoutes)
      },
      {
        path: 'appointments-results',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA', 'SECRETARIA'] },
        loadChildren: () =>
          import('./feature-groups/appointments-results/routes/appointments-results.routes').then(
            (m) => m.appointmentsResultsRoutes
          )
      },
      {
        path: 'care-management',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA', 'SECRETARIA', 'BIOQUIMICO'] },
        loadChildren: () =>
          import('./feature-groups/care-management/routes/care-management.routes').then(
            (m) => m.careManagementRoutes
          )
      },
      {
        path: 'procurement-inventory',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'MANAGER_STOCK', 'OPERADOR_COMPRAS'] },
        loadChildren: () =>
          import('./feature-groups/procurement-inventory/routes/procurement-inventory.routes').then(
            (m) => m.procurementInventoryRoutes
          )
      },
      {
        path: 'patients',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA', 'SECRETARIA'] },
        loadChildren: () =>
          import('./feature-groups/patients/routes/patients.routes').then((m) => m.patientsRoutes)
      },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./shared/components/unauthorized/unauthorized.component').then(
            (m) => m.UnauthorizedComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'home-dashboard' },
      { path: '**', redirectTo: 'home-dashboard' }
    ]
  }
];
