import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { map } from 'rxjs';

import { CashSessionService } from '../application/cash-session.service';

export const canOpenCashGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(CashSessionService);

  return sessionService.loadCurrentSession().pipe(
    map(session => {
      if (session) {
        return router.createUrlTree(['/billing-collections/dashboard']) as UrlTree;
      }
      return true;
    })
  );
};
