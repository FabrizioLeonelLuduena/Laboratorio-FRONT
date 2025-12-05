import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

/**
 * Guard to protect routes that require user authentication (verifies jwt token).
 * Redirects to the login page if the user is not authenticated.
 */

export const authGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && !authService.isTokenExpired()) {
    return true;
  } else if (authService.isTokenExpired()) {
    // If the token is expired, log out the user with a message.
    authService.logout();
    // logout method handles the navigation to login
    return false;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
