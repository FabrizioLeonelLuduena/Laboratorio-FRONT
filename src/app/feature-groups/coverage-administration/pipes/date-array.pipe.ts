import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms a date received from the backend
 * (can be [2025,9,1], "2025,9,1" or "2025-09-01")
 * to dd/mm/yyyy format for UI display.
 */
@Pipe({ name: 'dateArray', standalone: true })
export class DateArrayPipe implements PipeTransform {
  /**
   * Transforms the date value to dd/mm/yyyy string.
   */
  transform(value: any): string {
    if (!value) return '';

    // Case: [2025,9,1]
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day] = value;
      return this.format(day, month, year);
    }

    // Case: "2025,9,1"
    if (typeof value === 'string' && value.includes(',')) {
      const [year, month, day] = value.split(',').map(Number);
      return this.format(day, month, year);
    }

    // Case: ISO string "2025-09-01"
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    return value;
  }

  /**
   * Formats the date as dd/mm/yyyy.
   */
  private format(day: number, month: number, year: number): string {
    return `${day.toString().padStart(2, '0')}/${month
      .toString()
      .padStart(2, '0')}/${year}`;
  }
}
