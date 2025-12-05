import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to format date strings from dd-MM-yyyy to more readable formats.
 * Useful for displaying appointment dates in a user-friendly format.
 * 
 * @example
 * ```html
 * <!-- Input: "15-10-2025" Output: "15 de Octubre, 2025" -->
 * <span>{{ appointment.date | appointmentDate }}</span>
 * 
 * <!-- Input: "01-01-2025" Output: "1 de Enero, 2025" -->
 * <span>{{ '01-01-2025' | appointmentDate }}</span>
 * 
 * <!-- Custom format -->
 * <span>{{ appointment.date | appointmentDate:'short' }}</span>
 * ```
 */
@Pipe({
  name: 'appointmentDate',
  standalone: true
})
export class AppointmentDatePipe implements PipeTransform {
  /** Spanish month names */
  private readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  /** Spanish day names */
  private readonly dayNames = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  /**
   * Transforma una fecha recibida como string a formatos legibles.
   * Acepta entradas en 'dd-MM-yyyy', 'dd/MM/yyyy' o 'yyyy-MM-dd'.
   *
   * - format 'short' => 'dd-MM-yyyy'
   * - format 'long'  => 'd de <Mes>, yyyy'
   * - format 'dayOnly' => nombre del día de la semana (es)
   */
  transform(value: string | Date, format: 'long' | 'short' | 'dayOnly' = 'long'): string {
    if (!value) return value as string;

    let day: number;
    let month: number;
    let year: number;

    if (value instanceof Date) {
      day = value.getDate();
      month = value.getMonth() + 1;
      year = value.getFullYear();
    } else if (typeof value === 'string') {
      const v = value.trim();
      let m: RegExpExecArray | null;
      if ((m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v))) {
        // dd-MM-yyyy
        day = Number(m[1]);
        month = Number(m[2]);
        year = Number(m[3]);
      } else if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v))) {
        // dd/MM/yyyy
        day = Number(m[1]);
        month = Number(m[2]);
        year = Number(m[3]);
      } else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v))) {
        // yyyy-MM-dd
        year = Number(m[1]);
        month = Number(m[2]);
        day = Number(m[3]);
      } else {
        return value; // formato no reconocido
      }
    } else {
      return value as string;
    }

    // Validar componentes y fecha real
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
      return typeof value === 'string' ? value : value.toString();
    }
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return typeof value === 'string' ? value : value.toString();
    }

    const dd = day.toString().padStart(2, '0');
    const MM = month.toString().padStart(2, '0');

    switch (format) {
    case 'short':
      // Pedido: dd-MM-yyyy
      return `${dd}-${MM}-${year}`;
    case 'dayOnly':
      return this.dayNames[date.getDay()];
    case 'long':
    default:
      return `${day} de ${this.monthNames[month - 1]}, ${year}`;
    }
  }
}