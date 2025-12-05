import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

/**
 * Allows access only when the user has the FACTURISTA role.
 * Otherwise redirects to petty cash home.
 */
export const onlyFacturistaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = auth.getUserRoles();
  const isFacturista = roles.includes('FACTURISTA');

  if (isFacturista) {
    return true;
  }

  return router.createUrlTree(['/billing-collections/home']) as UrlTree;
};

