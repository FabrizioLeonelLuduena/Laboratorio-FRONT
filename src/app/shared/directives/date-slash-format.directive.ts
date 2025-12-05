import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Format the entrances adding '/' automactly in format dd/MM/yyyy
 * while the user write.
 */
@Directive({
  selector: 'p-datepicker[appDateSlashFormat]',
  standalone: true
})
export class DateSlashFormatDirective {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  /** Format in live */
  @HostListener('input', ['$event'])
  onInput(ev: Event): void {
    const inputEl = ev.target as HTMLInputElement | null;
    if (!inputEl) return;

    const raw = inputEl.value ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 8); // ddMMyyyy

    const formatted = this.formatWithSlashes(digits);

    if (inputEl.value !== formatted) {
      inputEl.value = formatted;
    }

    if (digits.length === 8 && this.ngControl?.control) {
      const date = this.parseDate(digits);
      if (date) {
        this.ngControl.control.setValue(date, { emitEvent: true });
      }
    }
  }

  /** Make sure that the value is consistent when the user leaves the field */
  @HostListener('blur', ['$event'])
  onBlur(ev: FocusEvent): void {
    const inputEl = ev.target as HTMLInputElement | null;
    if (!inputEl) return;

    const digits = (inputEl.value ?? '').replace(/\D/g, '');
    if (!digits) {
      // Vacío => null
      this.ngControl?.control?.setValue(null, { emitEvent: false });
      return;
    }

    if (digits.length === 8) {
      const date = this.parseDate(digits);
      if (date) {
        this.ngControl?.control?.setValue(date, { emitEvent: true });
        inputEl.value = this.formatWithSlashes(digits); // asegura dd/MM/yyyy
      }
    } else {
      // Incompleto => no seteamos valor, dejamos que el usuario continúe
      inputEl.value = this.formatWithSlashes(digits);
    }
  }

  /**
   * Formats a string of digits into dd/MM/yyyy format.
   */
  private formatWithSlashes(d: string): string {
    // Reglas:
    // - 1..2 => dd; cuando llega a 2 => dd/
    // - 3..4 => dd/m o dd/mm y cuando llega a 4 => dd/mm/
    // - 5..8 => dd/mm/yyyy (sin slash al final)
    if (!d) return '';
    const len = d.length;
    const dd = d.substring(0, Math.min(2, len));
    if (len <= 1) return dd;
    if (len === 2) return `${dd}/`;

    const mm = d.substring(2, Math.min(4, len));
    if (len <= 3) return `${dd}/${mm}`; // ej: 06/1
    if (len === 4) return `${dd}/${mm}/`;

    const yyyy = d.substring(4, Math.min(8, len));
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Parses a string of 8 digits (ddMMyyyy) into a Date object.
   */
  private parseDate(digits: string): Date | null {
    if (digits.length !== 8) return null;
    const day = parseInt(digits.substring(0, 2), 10);
    const month = parseInt(digits.substring(2, 4), 10);
    const year = parseInt(digits.substring(4, 8), 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    // Mes en Date es 0-based
    const date = new Date(year, month - 1, day);
    // Validación simple de consistencia (ej: 31/02 inválido)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }
}
