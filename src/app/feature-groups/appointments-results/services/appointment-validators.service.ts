import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validators for appointment configuration forms.
 * Provides validation logic specific to appointment management business rules.
 *
 * @example
 * ```typescript
 * // In form builder
 * this.formBuilder.group({
 *   startTime: ['', [Validators.required, AppointmentValidators.timeFormat()]],
 *   endTime: ['', [Validators.required, AppointmentValidators.timeFormat()]],
 *   validFromDate: ['', [Validators.required]],
 *   validToDate: ['', [Validators.required]]
 * }, {
 *   validators: [
 *     AppointmentValidators.timeRange('startTime', 'endTime'),
 *     AppointmentValidators.dateRange('validFromDate', 'validToDate')
 *   ]
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AppointmentValidators {

  /**
   * Validates that a time string is in HH:mm format.
   *
   * @returns Validator function
   *
   * @example
   * ```typescript
   * // Valid: "09:30", "23:59"
   * // Invalid: "9:30", "25:00", "abc"
   * ```
   */
  static timeFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values, let required validator handle it
      }

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (!timeRegex.test(control.value)) {
        return { timeFormat: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that end time is after start time.
   * Should be used as a form validator, not a control validator.
   *
   * @param startTimeField - Name of the start time form control
   * @param endTimeField - Name of the end time form control
   * @returns Validator function for form group
   *
   * @example
   * ```typescript
   * // Valid: startTime: "09:00", endTime: "17:00"
   * // Invalid: startTime: "17:00", endTime: "09:00"
   * ```
   */
  static timeRange(startTimeField: string, endTimeField: string, minGapMinutes = 0): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startTime = control.get(startTimeField)?.value;
      const endTime = control.get(endTimeField)?.value;

      if (!startTime || !endTime) {
        return null; // Don't validate if either field is empty
      }

      const start = this.parseTime(startTime);
      const end = this.parseTime(endTime);

      if (start >= end) {
        return { timeRange: { startTime, endTime, message: 'La hora de fin debe ser posterior a la hora de inicio.' } };
      }

      if (minGapMinutes > 0) {
        const diff = (end - start) / (1000 * 60); // difference in minutes
        if (diff < minGapMinutes) {
          return { timeRange: { startTime, endTime, message: `La hora de fin debe ser al menos ${minGapMinutes} minutos posterior a la hora de inicio.` } };
        }
      }

      return null;
    };
  }

  /**
   * Validates that end date is after start date.
   * Should be used as a form validator, not a control validator.
   *
   * @param startDateField - Name of the start date form control
   * @param endDateField - Name of the end date form control
   * @returns Validator function for form group
   *
   * @example
   * ```typescript
   * // Valid: startDate: "2025-01-01", endDate: "2025-12-31"
   * // Invalid: startDate: "2025-12-31", endDate: "2025-01-01"
   * ```
   */
  static dateRange(startDateField: string, endDateField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get(startDateField)?.value;
      const endDate = control.get(endDateField)?.value;

      if (!startDate || !endDate) {
        return null; // Don't validate if either field is empty
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Reset time to compare only dates
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (start > end) {
        return { dateRange: { startDate, endDate } };
      }

      return null;
    };
  }

  /**
   * Validates that a date is not in the past.
   *
   * @param allowToday - Whether today's date is valid (default: true)
   * @returns Validator function
   *
   * @example
   * ```typescript
   * // Valid: tomorrow's date, today (if allowToday: true)
   * // Invalid: yesterday's date
   * ```
   */
  static futureDate(allowToday: boolean = true): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const inputDate = new Date(control.value);
      const today = new Date();

      // Reset time to compare only dates
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      if (allowToday && inputDate.getTime() === today.getTime()) {
        return null; // Today is valid
      }

      if (inputDate.getTime() < today.getTime()) {
        return { futureDate: { value: control.value, allowToday } };
      }

      return null;
    };
  }

  /**
   * Validates that appointment count is within reasonable business limits.
   *
   * @param min - Minimum number of appointments (default: 1)
   * @param max - Maximum number of appointments (default: 50)
   * @returns Validator function
   *
   * @example
   * ```typescript
   * // Valid: 5, 10, 25
   * // Invalid: 0, -1, 100
   * ```
   */
  static appointmentCount(min: number = 1, max: number = 50): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null;
      }

      const value = Number(control.value);

      if (isNaN(value)) {
        return { appointmentCount: { value: control.value, message: 'Must be a number' } };
      }

      if (value < min) {
        return { appointmentCount: { value, min, message: `Minimum ${min} appointments required` } };
      }

      if (value > max) {
        return { appointmentCount: { value, max, message: `Maximum ${max} appointments allowed` } };
      }

      return null;
    };
  }

  /**
   * Validates that a day of week is selected when recurring is enabled.
   * Should be used as a form validator.
   *
   * @param recurringField - Name of the recurring boolean control
   * @param dayOfWeekField - Name of the day of week control
   * @returns Validator function for form group
   */
  static recurringDayRequired(recurringField: string, dayOfWeekField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const isRecurring = control.get(recurringField)?.value;
      const dayOfWeek = control.get(dayOfWeekField)?.value;

      if (isRecurring && (!dayOfWeek || dayOfWeek.length === 0)) {
        return { recurringDayRequired: { isRecurring, dayOfWeek } };
      }

      return null;
    };
  }

  /**
   * Validates that the date range doesn't exceed a maximum period.
   *
   * @param maxDays - Maximum number of days allowed (default: 365)
   * @param startDateField - Name of the start date control
   * @param endDateField - Name of the end date control
   * @returns Validator function for form group
   */
  static maxDateRange(maxDays: number = 365, startDateField: string = 'validFromDate', endDateField: string = 'validToDate'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get(startDateField)?.value;
      const endDate = control.get(endDateField)?.value;

      if (!startDate || !endDate) {
        return null;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > maxDays) {
        return { maxDateRange: { diffDays, maxDays } };
      }

      return null;
    };
  }

  /**
   * Parses a time string (HH:mm) to minutes since midnight for comparison.
   *
   * @param timeString - Time in HH:mm format
   * @returns Minutes since midnight
   * @private
   */
  private static parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return (hours * 60 + minutes) * 60 * 1000; // return in milliseconds
  }

  /**
   * Gets user-friendly error messages for validation errors.
   *
   * @param errors - Validation errors object
   * @returns Human-readable error message
   *
   * @example
   * ```typescript
   * const errors = control.errors;
   * const message = AppointmentValidators.getErrorMessage(errors);
   * console.log(message); // "El horario de fin debe ser posterior al de inicio"
   * ```
   */
  static getErrorMessage(errors: ValidationErrors | null): string {
    if (!errors) return '';

    if (errors['timeRange']) {
      return errors['timeRange'].message;
    }

    const errorMessages: Record<string, string> = {
      required: 'Este campo es requerido',
      timeFormat: 'Formato de hora inválido (use HH:mm)',
      dateRange: 'La fecha de fin debe ser posterior a la de inicio',
      futureDate: 'La fecha debe ser futura',
      appointmentCount: 'Cantidad de turnos inválida',
      recurringDayRequired: 'Debe seleccionar al menos un día de la semana para configuraciones recurrentes',
      maxDateRange: 'El rango de fechas excede el máximo permitido'
    };

    // Return the first error message found
    for (const [key, message] of Object.entries(errorMessages)) {
      if (errors[key]) {
        return message;
      }
    }

    return 'Error de validación';
  }
}
