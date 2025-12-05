import { Routes } from '@angular/router';

import { InternalUserEditingFormComponent } from '../pages/internal-user-editing-form/internal-user-editing-form.component';
import { InternalUserRegisterComponent } from '../pages/internal-user-register/internal-user-register.component';
import { InternalUserTableComponent } from '../pages/internal-user-table/internal-user-table.component';
import { UserProfileComponent } from '../pages/user-profile/user-profile.component';
import { UserSettingsComponent } from '../pages/user-settings/user-settings.component';
import { UserHomeComponent } from '../user-home/user-home.component';

export const userManagementRoutes: Routes = [
  {
    path: '',
    component: UserHomeComponent,
    data: { breadcrumb: 'Gestión de usuarios' },
    children: [
      { path: '', redirectTo: 'table', pathMatch: 'full' },
      { path: 'table', component: InternalUserTableComponent, data: { breadcrumb: 'Usuarios' } },
      { path: 'new-user', component: InternalUserRegisterComponent },
      { path: 'profile', component: UserProfileComponent },
      { path: 'settings', component: UserSettingsComponent },
      //{ path: 'users-reports', component: UsersReportsComponent },
      { path: 'user/:id', component: InternalUserEditingFormComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
