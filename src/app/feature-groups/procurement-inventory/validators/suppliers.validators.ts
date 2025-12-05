import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para CUIT argentino (11 dígitos)
 */
export function cuitValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validar si está vacío (usar required por separado)
    }

    const value = control.value.toString().replace(/\D/g, ''); // Solo números
    
    if (value.length !== 11) {
      return { cuitLength: { requiredLength: 11, actualLength: value.length } };
    }

    // Validar formato de CUIT (XX-XXXXXXXX-X)
    const cuitPattern = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuitPattern.test(control.value)) {
      return { cuitFormat: true };
    }

    return null;
  };
}

/**
 * Validador para formato de teléfono
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const phonePattern = /^\+?[0-9. ()-]{7,20}$/;
    if (!phonePattern.test(control.value)) {
      return { phoneFormat: true };
    }

    return null;
  };
}

/**
 * Validador para tipos de suministro
 */
export function supplyTypesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !Array.isArray(control.value)) {
      return null;
    }

    const validTypes = [
      'Descartables',
      'Reactivos',
      'Maquinaria',
      'Mobiliario',
      'Electrodomésticos',
      'Insumos de limpieza',
      'Insumos de oficina'
    ];

    const invalidTypes = control.value.filter((type: string) => !validTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return { invalidSupplyTypes: { invalidTypes } };
    }

    return null;
  };
}

/**
 * Validador para al menos un contacto
 */
export function atLeastOneContactValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !Array.isArray(control.value) || control.value.length === 0) {
      return { atLeastOneContact: true };
    }

    return null;
  };
}

/**
 * Validador para contacto válido
 */
export function validContactValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !Array.isArray(control.value)) {
      return null;
    }

    const invalidContacts = control.value.filter((contact: any) => {
      return !contact.name || !contact.email || !contact.phone;
    });

    if (invalidContacts.length > 0) {
      return { invalidContacts: true };
    }

    return null;
  };
}
