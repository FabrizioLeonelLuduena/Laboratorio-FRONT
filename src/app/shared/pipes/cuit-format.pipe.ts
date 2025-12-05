import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear el CUIT con guiones
 * Formato: XX-XXXXXXXX-X
 */
@Pipe({
  name: 'cuitFormat',
  standalone: true
})
export class CuitFormatPipe implements PipeTransform {
  /**
   * Transforma un CUIT sin formato a formato con guiones
   * @param value - El CUIT sin formato (puede tener o no guiones)
   * @returns El CUIT formateado como XX-XXXXXXXX-X
   */
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    // Eliminar todos los caracteres no numéricos
    const numbersOnly = value.replace(/\D/g, '');

    // Si no tiene 11 dígitos, devolver el valor original
    if (numbersOnly.length !== 11) {
      return value;
    }

    // Formatear como XX-XXXXXXXX-X
    return `${numbersOnly.substring(0, 2)}-${numbersOnly.substring(2, 10)}-${numbersOnly.substring(10, 11)}`;
  }
}

