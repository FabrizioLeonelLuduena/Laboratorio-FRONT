import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { ManualService } from './manual.service';

/**
 * Guard que asegura que el índice del manual esté completamente cargado
 * antes de mostrar el layout (incluyendo el sidebar).
 * Esto previene que el sidebar aparezca vacío en el primer render.
 */
export const manualLayoutGuard: CanActivateFn = async () => {
  const manualService = inject(ManualService);
  
  // Esperar a que el índice esté completamente cargado
  await manualService.waitForIndex();
  
  return true;
};
