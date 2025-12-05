import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const userRoles = authService.getUserRoles(); // decodifies JWT and gets roles
  const requiredRoles = route.data['roles'] as string[];

  // If no roles are required, allow access
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // Check if user has at least one of the required roles
  const hasAccess = userRoles.some(r => requiredRoles.includes(r));

  if (!hasAccess) {
    router.navigate(['/unauthorized']); // redirect to unauthorized page
    return false;
  }

  return true;
};
