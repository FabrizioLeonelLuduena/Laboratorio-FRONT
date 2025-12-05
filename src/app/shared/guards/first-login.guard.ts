import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

/**
 * Guard to enforce password change on first login.
 * Redirects to the password reset component if the user is logging in for the first time
 * (because they are logging but have not changed their password so they could not navigate).
**/
export const firstLoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  // support both snake_case and camelCase token keys
  const firstLoginToken = localStorage.getItem('first_login_token') || localStorage.getItem('firstLoginToken');

  // If the user has is_first_login flag or a first login token, redirect to password reset
  if (user?.isFirstLogin || firstLoginToken) {
    router.navigate(['/password-reset'], { queryParams: { first: true } });
    return false;
  }

  return true;
};
