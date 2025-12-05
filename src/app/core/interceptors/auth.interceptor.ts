import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../authentication/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Agrega el token JWT a las solicitudes HTTP si el usuario está autenticado
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
