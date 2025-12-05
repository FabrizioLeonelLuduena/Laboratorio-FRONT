import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to format attention numbers
 * Converts numeric IDs to formatted strings with prefix based on whether it has a shift/appointment
 * - With shift: CT-001 (Con Turno)
 * - Without shift: ST-001 (Sin Turno)
 */
@Pipe({
  name: 'attentionNumber',
  standalone: true
})
export class AttentionNumberPipe implements PipeTransform {
  /**
   * Transforms an attention number or ID into a formatted string
   * @param value - The attention number (can be string or number)
   * @param hasShift - Whether the attention has an appointment/shift (default: true)
   * @returns Formatted attention number (e.g., "CT-001" or "ST-001")
   */
  transform(value: string | number | null | undefined, hasShift: boolean = true): string {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    // Convert to string and remove any non-numeric characters
    const numericValue = String(value).replace(/\D/g, '');

    if (!numericValue) {
      return 'N/A';
    }

    // Pad with leading zeros to make it 3 digits minimum
    const paddedNumber = numericValue.padStart(3, '0');

    // Format based on whether it has a shift
    // CT = Con Turno (With appointment)
    // ST = Sin Turno (Without appointment)
    const prefix = hasShift ? 'CT' : 'ST';

    return `${prefix}-${paddedNumber}`;
  }
}
