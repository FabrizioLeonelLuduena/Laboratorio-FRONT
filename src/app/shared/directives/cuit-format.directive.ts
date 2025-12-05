import { Directive, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directiva para formatear automáticamente el CUIT con guiones
 * Formato: XX-XXXXXXXX-X
 */
@Directive({
  selector: '[appCuitFormat]',
  standalone: true
})
export class CuitFormatDirective {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  /**
   * Escucha el evento input para formatear mientras el usuario escribe
   */
  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    if (!this.ngControl) {
      return;
    }

    const numbersOnly = value.replace(/\D/g, '');
    const limitedNumbers = numbersOnly.substring(0, 11);

    let formatted = limitedNumbers;
    if (limitedNumbers.length > 10) {
      formatted = `${limitedNumbers.substring(0, 2)}-${limitedNumbers.substring(2, 10)}-${limitedNumbers.substring(10, 11)}`;
    } else if (limitedNumbers.length > 2) {
      formatted = `${limitedNumbers.substring(0, 2)}-${limitedNumbers.substring(2)}`;
    }

    // Actualiza el valor en el control de formulario sin disparar un nuevo evento 'input'
    // para evitar bucles infinitos.
    if (this.ngControl.value !== formatted) {
      this.ngControl.control!.setValue(formatted, { emitEvent: false });
    }
  }

  /**
   * Escucha el evento blur para asegurar formato correcto al salir del campo
   */
  @HostListener('blur')
  onBlur(): void {
    const value = this.ngControl?.value as string | null;
    if (!value) {
      return;
    }

    const numbersOnly = value.replace(/\D/g, '');

    // Si tiene 11 dígitos, formatear correctamente
    if (numbersOnly.length === 11) {
      const formatted =
        `${numbersOnly.substring(0, 2)}-${numbersOnly.substring(2, 10)}-${numbersOnly.substring(10, 11)}`;
      if (value !== formatted) {
        this.ngControl!.control!.setValue(formatted, { emitEvent: false });
      }
    }
  }
}
