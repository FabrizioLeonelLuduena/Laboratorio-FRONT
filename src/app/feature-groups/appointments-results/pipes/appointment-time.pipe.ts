import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to format time strings from HH:mm:ss to HH:mm format.
 * Useful for displaying appointment times in a more user-friendly format.
 * 
 * @example
 * ```html
 * <!-- Input: "09:30:00" Output: "09:30" -->
 * <span>{{ appointment.startTime | appointmentTime }}</span>
 * 
 * <!-- Input: "17:00:00" Output: "17:00" -->
 * <span>{{ '17:00:00' | appointmentTime }}</span>
 * ```
 */
@Pipe({
  name: 'appointmentTime',
  standalone: true
})
export class AppointmentTimePipe implements PipeTransform {
  /**
   * Transforms a time string from HH:mm:ss format to HH:mm format.
   * 
   * @param value - Time string in HH:mm:ss format
   * @returns Formatted time string in HH:mm format, or original value if invalid
   * 
   * @example
   * ```typescript
   * const pipe = new AppointmentTimePipe();
   * console.log(pipe.transform('09:30:00')); // "09:30"
   * console.log(pipe.transform('17:00:00')); // "17:00"
   * console.log(pipe.transform('invalid'));  // "invalid"
   * ```
   */
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }
    
    // Check if the value matches HH:mm:ss format
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(value)) {
      return value;
    }
    
    // Extract hours and minutes (ignore seconds)
    const [hours, minutes] = value.split(':');
    return `${hours}:${minutes}`;
  }
}