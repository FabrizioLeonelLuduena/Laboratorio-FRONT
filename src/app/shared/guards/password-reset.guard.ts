import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';

import { Observable, of } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { PasswordResetService } from 'src/app/feature-groups/user-management/services/password-reset.service';

import { catchError, map } from 'rxjs/operators';

/**
 * Guard to protect the /password-reset route.
 * Allows access if:
 * - It's a first-login password reset (indicated by query param or localStorage token), or
 * - The user is logged in and has a valid password reset token verified by the backend.
 * Otherwise, redirects to /login.
 */
export const passwordResetGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const passwordResetService = inject(PasswordResetService);

  const qp = route.queryParamMap;
  const isFirstParam = qp.get('first') === 'true';
  // search for first-login token in localStorage or query params
  const firstTokenLsRaw = localStorage.getItem('first_login_token') || localStorage.getItem('firstLoginToken');
  const firstTokenQpRaw = qp.get('firstLoginToken') || qp.get('first_login_token');
  const resetTokenQpRaw = qp.get('token');

  const isValidToken = (t?: string | null) => !!t && t !== 'null' && t !== 'undefined' && t.trim() !== '';
  const firstTokenLs = isValidToken(firstTokenLsRaw) ? firstTokenLsRaw as string : null;
  const firstTokenQp = isValidToken(firstTokenQpRaw) ? firstTokenQpRaw as string : null;
  const resetTokenQp = isValidToken(resetTokenQpRaw) ? resetTokenQpRaw as string : null;

  const user = authService.getUser();

  // If it's first-login, allow only if there's a first-login token or the logged-in user has is_first_login flag
  if (isFirstParam || firstTokenLs || firstTokenQp) {
    if (firstTokenLs || firstTokenQp || (user && (user as any).is_first_login)) {
      return true;
    }
    // tehre is no token or valid user -> redirect to login
    return router.parseUrl('/login');
  }

  // nromal flow: require token in query params and validate with backend
  if (resetTokenQp) {
    return passwordResetService.validateToken(resetTokenQp).pipe(
      map(() => true),
      catchError(() => of(router.parseUrl('/login')))
    );
  }

  // there is no token and it's not first-login -> redirect to login
  return router.parseUrl('/login');
};
