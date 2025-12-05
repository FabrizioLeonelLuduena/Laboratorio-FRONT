import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ManualService } from './manual.service';

/**
 * Guard que asegura que el índice del manual esté cargado antes de navegar a una página específica.
 * Si no se encuentra el módulo o página, redirige al home del manual.
 */
export const manualPageGuard: CanActivateFn = async (route) => {
  const manualService = inject(ManualService);
  const router = inject(Router);

  const moduleId = route.paramMap.get('moduleId');
  const pageId = route.paramMap.get('pageId');

  if (!moduleId || !pageId) {
    return router.createUrlTree(['/manual']);
  }

  // Esperar a que el índice esté cargado
  await manualService.waitForIndex();

  const idx = manualService.index();
  if (!idx) {
    return router.createUrlTree(['/manual']);
  }

  // Verificar que exista el módulo y la página
  const mod = idx.modules.find((m) => m.id === moduleId);
  if (!mod) {
    return router.createUrlTree(['/manual']);
  }

  const pageMeta = mod.sidebar.find((p) => p.id === pageId);
  if (!pageMeta) {
    return router.createUrlTree(['/manual']);
  }

  return true;
};

