import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { MessageService } from 'primeng/api';

const EGRESO_ACCESS_KEY = 'egreso_access_from_goods_receipts';

/**
 * Guard to restrict access to the stock movements egreso (RETURN) feature.
 * Only allows access when navigating from goods-receipts with proper context.
 *
 * @param route - The activated route snapshot
 * @param state - The router state snapshot
 * @returns true if access is allowed, false otherwise
 */
export const egresoAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const messageService = inject(MessageService);

  // Check if the route has type=RETURN query param
  const movementType = route.queryParams['type'];
  const isReturnType = movementType === 'RETURN';

  // Only apply guard logic for RETURN type movements
  if (!isReturnType) {
    return true;
  }

  // Verify if navigation comes from good receipts with proper state
  const navigation = router.getCurrentNavigation();
  const stateFromNavigation = navigation?.extras?.state?.['fromGoodReceipts'];

  // Check sessionStorage - this is set when coming from goods-receipts
  const sessionFlag = sessionStorage.getItem(EGRESO_ACCESS_KEY);

  const allowAccess = stateFromNavigation || sessionFlag === 'true';

  if (!allowAccess) {
    messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: 'Solo se puede ingresar iniciando una devolución desde el apartado de remitos.'
    });

    router.navigate(['/procurement-inventory/goods-receipts']);
    return false;
  }

  // Set session flag if coming from navigation state (first time)
  if (stateFromNavigation) {
    sessionStorage.setItem(EGRESO_ACCESS_KEY, 'true');
  }

  return true;
};
