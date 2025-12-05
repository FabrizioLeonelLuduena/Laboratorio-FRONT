import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator: digits only
 * @param control - The form control to validate
 * @returns Validation error if the value contains non-digit characters, null otherwise
 */
export const digitsOnlyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const str = String(v);
  return /^\d+$/.test(str) ? null : { digitsOnly: true };
};

/**
 * Validator: minimum number of digits
 * @param min - The minimum number of digits required
 * @returns A validator function
 */
export const minDigitsValidator = (min: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;
    const str = String(v);
    return str.length >= min ? null : { minDigits: { required: min, actual: str.length } };
  };
};

/**
 * Validator: Argentine CUIT (tax identification number)
 * Format: XX-XXXXXXXX-X (11 digits with hyphens)
 * @param control - The form control to validate
 * @returns Validation error with Spanish message if invalid, null otherwise
 */
export const cuitValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const str = String(v).trim();

  // Format with hyphens: XX-XXXXXXXX-X
  const cuitPattern = /^\d{2}-\d{8}-\d{1}$/;

  if (!cuitPattern.test(str)) {
    return { cuit: { message: 'Formato inválido. Use: XX-XXXXXXXX-X' } };
  }

  return null;
};

/**
 * Validator: Business name (razón social)
 * Allows letters, numbers, spaces, and common special characters
 * @param control - The form control to validate
 * @returns Validation error with Spanish message if invalid, null otherwise
 */
export const businessNameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const str = String(v).trim();

  // Allows letters (with accents), numbers, spaces, and chars: . , - ( ) &
  const validPattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,\-()&]+$/;

  if (!validPattern.test(str)) {
    return { businessName: { message: 'Contiene caracteres no permitidos' } };
  }

  if (str.length < 3) {
    return { businessName: { message: 'Debe tener al menos 3 caracteres' } };
  }

  return null;
};

/**
 * Validator: Argentine phone number
 * Allows only numbers, spaces, hyphens, parentheses, and the + prefix
 * @param control - The form control to validate
 * @returns Validation error with Spanish message if invalid, null otherwise
 */
export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const str = String(v).trim();

  // Allows: +54, numbers, spaces, hyphens, parentheses
  const phonePattern = /^[\d\s()\-+]+$/;

  if (!phonePattern.test(str)) {
    return { phone: { message: 'Solo se permiten números y caracteres: + - ( )' } };
  }

  // Must have at least 8 digits (excluding special characters)
  const digitsOnly = str.replace(/[\s()\-+]/g, '');
  if (digitsOnly.length < 8) {
    return { phone: { message: 'Debe tener al menos 8 dígitos' } };
  }

  return null;
};

/**
 * Validator: Argentine address (domicilio)
 * Allows letters, numbers, spaces, and common address characters
 * @param control - The form control to validate
 * @returns Validation error with Spanish message if invalid, null otherwise
 */
export const addressValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const str = String(v).trim();

  // Allows letters (with accents), numbers, spaces, and chars: , . - ° / º ª
  const addressPattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,\-°/ºª]+$/;

  if (!addressPattern.test(str)) {
    return { address: { message: 'Contiene caracteres no permitidos' } };
  }

  if (str.length < 5) {
    return { address: { message: 'Debe tener al menos 5 caracteres' } };
  }

  return null;
};