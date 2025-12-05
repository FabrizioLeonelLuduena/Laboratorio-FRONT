import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';

import { Observable, of, timer } from 'rxjs';

import { map, switchMap, catchError } from 'rxjs/operators';

import { SuppliersService } from '../services/suppliers.service';

/**
 * Validador síncrono de CUIT argentino según algoritmo oficial
 */
export function cuitValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validar si está vacío (usar Validators.required por separado)
    }

    // Normalizar: quitar guiones y espacios
    const cuit = control.value.toString().replace(/[-\s]/g, '');

    // Verificar que tenga 11 dígitos
    if (!/^\d{11}$/.test(cuit)) {
      return { invalidCuit: { message: 'El CUIT debe tener 11 dígitos' } };
    }

    // Extraer dígitos
    const digits = cuit.split('').map(Number);

    // Pesos para validación
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    // Calcular suma ponderada
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * weights[i];
    }

    // Calcular dígito verificador
    let mod = sum % 11;
    let expectedDv = 11 - mod;

    // Casos especiales
    if (expectedDv === 11) expectedDv = 0;
    if (expectedDv === 10) expectedDv = 9;

    // Verificar dígito verificador
    const actualDv = digits[10];

    if (actualDv !== expectedDv) {
      return {
        invalidCuit: {
          message: `CUIT inválido. Dígito verificador esperado: ${expectedDv}, recibido: ${actualDv}`
        }
      };
    }

    return null; // CUIT válido
  };
}

/**
 * Validador asíncrono para verificar si el CUIT ya existe en el sistema
 * @param suppliersService Servicio de proveedores
 * @param currentSupplierId ID del proveedor actual (opcional, para edición)
 */
export function cuitExistsAsyncValidator(
  suppliersService: SuppliersService,
  currentSupplierId?: number
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null);
    }

    const cuit = control.value.toString().replace(/[-\s]/g, '');

    // Si no hay un método existsCuit en el servicio, retornar null
    // Este validador solo funcionará cuando se implemente el endpoint en el backend
    if (typeof suppliersService.existsCuit !== 'function') {
      return of(null);
    }

    return timer(300).pipe( // Debounce de 300ms
      switchMap(() => suppliersService.existsCuit(cuit, currentSupplierId)),
      map((exists: boolean) => exists ? { cuitExists: { message: 'Este CUIT ya está registrado' } } : null),
      catchError(() => of(null))
    );
  };
}

/**
 * Formateador de CUIT: convierte "20123456789" a "20-12345678-9"
 */
export function formatCuit(cuit: string): string {
  if (!cuit) return '';
  const clean = cuit.replace(/[-\s]/g, '');
  if (clean.length !== 11) return cuit;
  return `${clean.substring(0, 2)}-${clean.substring(2, 10)}-${clean.substring(10)}`;
}

/**
 * Normalizador de CUIT: quita guiones y espacios
 */
export function normalizeCuit(cuit: string): string {
  if (!cuit) return '';
  return cuit.replace(/[-\s]/g, '');
}
