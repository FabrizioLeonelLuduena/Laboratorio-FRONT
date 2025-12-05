import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

/**
 * Blocks access to petty cash routes when user is FACTURISTA,
 * redirecting them to cash-general. Non-FACTURISTA users are allowed.
 */
export const noFacturistaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = auth.getUserRoles();
  const isFacturista = roles.includes('FACTURISTA');

  if (isFacturista) {
    return router.createUrlTree(['/billing-collections/cash-general']) as UrlTree;
  }

  return true;
};

