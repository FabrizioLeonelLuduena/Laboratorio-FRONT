import { AbstractControl, FormArray, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Utilities with reusable Angular reactive-form validators
 * for the Patients feature. All validators are synchronous
 * and return a `ValidatorFn` that can be attached to controls,
 * groups or arrays.
 *
 * Notes:
 * - Validators are side effect free.
 * - Error keys are standardized to integrate with GenericFormComponent UI.
 */
export class ValidatorUtils {
  /** DNI: only numbers - 7-8 digits */
  static dni(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };

      const dniRegex = /^\d+$/;
      if (!dniRegex.test(value)) {
        return { pattern: true };
      }
      if (value.length < 7 || value.length > 8) {
        return { pattern: true, length: true };
      }
      return null;
    };
  }

  /** Only letters, spaces, tildes (for names/last names) */
  static onlyLetters(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };

      const regex = /^[a-zA-ZÀ-ÿ\s]{2,50}$/;
      return regex.test(value) ? null : { pattern: true, onlyLetters: true };
    };
  }

  /** BirthDate: no future dates */
  static notFutureDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const birthDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      birthDate.setHours(0, 0, 0, 0);

      return birthDate > today ? { dateMax: true, futureDate: true } : null;
    };
  }

  /** Minimum age (e.g. 0, 18...) */
  static minAge(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const birthDate = new Date(value);
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age < min ? { minAge: { requiredAge: min, actualAge: age } } : null;
    };
  }

  /** Only Numbers */
  static onlyNumbers(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      const regex = /^\d+$/;
      return regex.test(value) ? null : { pattern: true, onlyNumbers: true };
    };
  }

  /** Member Number: only numbers, length between min and max */
  static memberNumber(min: number = 5, max: number = 12): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };

      const regex = /^\d+$/;
      if (!regex.test(value)) return { pattern: true };
      if (value.length < min) return { pattern: true, minlength: { requiredLength: min, actualLength: value.length } };
      if (value.length > max) return { pattern: true, maxlength: { requiredLength: max, actualLength: value.length } };
      return null;
    };
  }

  /** Validates contact value based on contactType */
  static contactValueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control || !control.parent) return null;
      const contactType = control.parent.get('contactType')?.value;
      const value = control.value;

      if (!value) return { required: true };

      switch (contactType) {
      case 'EMAIL': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : { email: true };
      }
      case 'TELEPHONE':
      case 'WHATSAPP': {
        const phoneRegex = /^[0-9]{7,15}$/;
        return phoneRegex.test(value) ? null : { pattern: true, phone: true };
      }
      default:
        return null;
      }
    };
  }

  /** Street number: only numbers, max 6 digits */
  static streetNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };

      const regex = /^[0-9]+$/;
      if (!regex.test(value)) return { pattern: true, onlyNumbers: true };
      if (value.length > 6) return { pattern: true, maxlength: { requiredLength: 6, actualLength: value.length } };
      return null;
    };
  }

  /** Floor number: optional but must be numeric */
  static floorNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value && value !== 0) return null;

      const regex = /^[0-9]+$/;
      return regex.test(value) ? null : { pattern: true, onlyNumbers: true };
    };
  }

  /** Zip code: only numbers, 4–10 digits */
  static zipCode(min: number = 4, max: number = 10): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };

      const regex = /^[0-9]+$/;
      if (!regex.test(value)) return { pattern: true, onlyNumbers: true };
      if (value.length < min) return { pattern: true, minlength: { requiredLength: min, actualLength: value.length } };
      if (value.length > max) return { pattern: true, maxlength: { requiredLength: max, actualLength: value.length } };
      return null;
    };
  }

  // ================== Array Validators ==================

  /** At least one primary address */
  static atLeastOnePrimaryAddress(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr) return null;
      const ok = arr.controls.some(addr => addr.get('isPrimary')?.value === true);
      return ok ? null : { noPrimaryAddress: true };
    };
  }

  /** Minimum number of addresses */
  static addressCount(min: number = 1): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr || arr.length < min) {
        return { minAddress: { required: min, actual: arr?.length || 0 } };
      }
      return null;
    };
  }

  /** At least one primary contact */
  static atLeastOnePrimaryContact(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr) return null;
      const ok = arr.controls.some(g => g.get('isPrimary')?.value === true);
      return ok ? null : { noPrimaryContact: true };
    };
  }

  /** Minimum contacts */
  static contactCount(min: number = 1): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr || arr.length < min) {
        return { minContact: { required: min, actual: arr?.length || 0 } };
      }
      return null;
    };
  }

  /** At least one primary coverage */
  static atLeastOnePrimary(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr || arr.length === 0) return { minCoverage: { required: 1, actual: 0 } };
      const hasPrimary = arr.controls.some(cov => cov.get('isPrimary')?.value === true);
      return hasPrimary ? null : { noPrimary: true };
    };
  }

  /** Min/max number of coverages */
  static coverageCount(min: number = 1, max: number = 2): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr) return null;
      if (arr.length < min) return { minCoverage: { required: min, actual: arr.length } };
      if (arr.length > max) return { maxCoverage: { required: max, actual: arr.length } };
      return null;
    };
  }

  /** Exactly one primary coverage */
  static uniquePrimaryCoverage(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      if (!arr || arr.length === 0) return null; // No coverages, no primary needed yet

      let primaryCount = 0;
      for (const cov of arr.controls) {
        if (cov.get('isPrimary')?.value === true) {
          primaryCount++;
        }
      }

      return primaryCount === 1 ? null : { uniquePrimary: true };
    };
  }

  /**
   * Validates an address FormGroup.F
   * If any field is filled, then street, number, city, province, and zipCode are required.
   */
  static addressGroupValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as FormGroup;
      if (!group) return null;

      const values = group.value;
      const allFields = ['street', 'streetNumber', 'city', 'province', 'zipCode'];
      const filledFields = allFields.filter(field => values[field]);

      // If no fields are filled, it's valid (will be cleaned up later)
      if (filledFields.length === 0) {
        return null;
      }

      // If some fields are filled, check if all required fields are filled
      const requiredFields = ['street', 'streetNumber', 'city', 'province', 'zipCode'];
      const missingFields = requiredFields.filter(field => !values[field]);

      if (missingFields.length > 0) {
        return { addressIncomplete: { missing: missingFields } };
      }

      return null;
    };
  }

}
