import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../../../core/authentication/auth.service';

export const rolesGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener los roles requeridos de la configuración de la ruta
  const requiredRoles = route.data?.['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // Si no hay roles requeridos, permitir acceso
  }

  // Obtener los roles del usuario actual
  const userRoles = authService.getUserRoles();

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    // Si no tiene permisos, redirigir a una página de error o dashboard
    router.navigate(['/dashboard']); // Ajustar según la ruta de error apropiada
    return false;
  }

  return true;
};
