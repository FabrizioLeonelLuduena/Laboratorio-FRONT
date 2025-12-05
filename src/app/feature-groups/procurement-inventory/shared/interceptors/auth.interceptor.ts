import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, throwError } from 'rxjs';

import { AuthService } from '../../../core/authentication/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Obtener el token del AuthService
  const token = authService.getToken();

  // Si existe token, agregarlo al header Authorization
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        // Mostrar alerta de permisos insuficientes
        // En un caso real, aquí se mostraría el GenericAlertComponent
        
        // Redirigir al login si es 401
        if (error.status === 401) {
          authService.logout();
        }
      }
      
      return throwError(() => error);
    })
  );
};
