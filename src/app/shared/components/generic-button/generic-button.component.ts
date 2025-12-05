import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * @component GenericButtonComponent
 *
 * Reusable and standardized button component with icon support,
 * visual variants, and fixed keyboard shortcuts.
 *
 * It allows the creation of common action buttons such as **Save**, **Accept**, **Cancel**, etc.
 * The `"search"` type is designed to work alongside search inputs,
 * executing its action through **F3** or a mouse click.
 *
 * This component centralizes button behavior, icons, and shortcuts
 * to maintain visual and functional consistency across the entire system.
 *
 * @example
 * ```html
 * <app-generic-button
 *   type="save"
 *   (pressed)="onSave()"
 * ></app-generic-button>
 * ```
 */
@Component({
  selector: 'app-generic-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-button.component.html',
  styleUrls: ['./generic-button.component.css']
})
export class GenericButtonComponent {
  /**
   * Visual and functional button type.
   * Determines preset text, icon, color, and keyboard shortcut.
   *
   * @default 'custom'
   */
  @Input() type:
    'save' | 'accept' | 'cancel' | 'back' | 'advance' | 'search' | 'create' | 'custom' | 'alternative'
    | 'invoice' | 'invoicePrint'
    = 'custom';

  /**
   * Button text (only applicable when `type` is `'custom'`).
   * @default ''
   */
  @Input() text: string = '';

  /**
   * Custom text color variable (CSS variable expected, e.g., `--brand-primary`).
   * @default ''
   */
  @Input() customTextColor: string = '';

  /**
   * Optional icon (only applicable for `custom` type).
   * Uses PrimeIcons or custom icon class names.
   * @example icon="pi pi-user"
   */
  @Input() icon: string = '';

  /**
   * Custom background color (only for `custom` type).
   * Should reference a CSS variable.
   * @example color="--brand-primary"
   */
  @Input() color: string = '';

  /**
   * Custom border color (only for `custom` type).
   * Should reference a CSS variable.
   */
  @Input() borderColor: string = '';

  /**
   * Icon position relative to text.
   * @default 'left' - Icon appears before text
   * Set to 'right' for icon after text (useful for advance/next buttons)
   */
  @Input() iconPosition: 'left' | 'right' = 'left';

  /**
   * Event emitted when the button is clicked or when its keyboard shortcut is pressed.
   * Emits the original DOM `Event` or `KeyboardEvent`.
   */
  @Output() pressed = new EventEmitter<Event | KeyboardEvent>();

  /**
   * Whether the button is disabled and non-interactive.
   * @default false
   */
  @Input() disabled: boolean = false;

  /**
   * Predefined presets for each button type.
   * Includes label text, icon, color, keyboard shortcut, and border styling.
   */
  presets: Record<string, any> = {
    save: { text: 'Guardar', icon: 'pi pi-file', bg: 'var(--brand-primary-700)', key: 'Enter', textColor: 'var(--on-primary)', border: '' },
    back: { text: 'Anterior', icon: 'pi pi-arrow-left', bg: 'var(--card)', key: 'F1', textColor: 'var(--on-surface)', border: '1px solid var(--border-color)' },
    cancel: { text: 'Cancelar', icon: 'pi pi-times', bg: 'var(--brand-warn)', key: 'Escape', textColor: 'var(--on-primary)', border: '' },
    accept: { text: 'Aceptar', icon: 'pi pi-check', bg: 'var(--brand-primary-700)', key: 'Enter', textColor: 'var(--on-primary)', border: '' },
    advance: { text: 'Siguiente', icon: 'pi pi-arrow-right', bg: 'var(--card)', key: 'F2', textColor: 'var(--on-surface)', border: '1px solid var(--border-color)' },

    /** Search button type */
    search: {
      text: 'Buscar',
      icon: 'pi pi-search',
      bg: 'var(--card)',
      key: 'F3',
      textColor: 'var(--on-surface)',
      border: '1px solid var(--brand-primary-700)'
    },

    /** Create new record */
    create: {
      text: '',
      icon: 'pi pi-plus',
      bg: 'var(--brand-primary-700)',
      key: 'F4',
      textColor: 'var(--on-primary)',
      border: ''
    },

    custom: { text: '', icon: '', bg: '', key: '', textColor: '', border: '' },
    alternative: { text: '', icon: '', bg: '', key: 'F9', textColor: 'var(--on-surface)', border: '1px solid color-mix(in srgb, var(--brand-accent) 80%, black)' },
    invoice: { text: 'Facturar', icon: 'pi pi-check-circle', bg: 'var(--brand-primary-700)', key: 'F8', textColor: 'var(--on-primary)', border: '' },
    invoicePrint: { text: 'Facturar e imprimir', icon: 'pi pi-print', bg: 'var(--brand-primary-700)', key: 'F9', textColor: 'var(--on-primary)', border: '' }
  };

  /**
   * Returns the button text depending on type or custom label.
   */
  get buttonLabel(): string {
    return this.presets[this.type].text || this.text;
  }

  /**
   * Returns the icon associated with the current button type.
   */
  get buttonIcon(): string {
    return this.presets[this.type].icon || this.icon;
  }

  /**
   * Returns the keyboard shortcut associated with the button type.
   * @example 'F3', 'F5', etc.
   */
  get shortcut(): string | null {
    return this.presets[this.type].key || null;
  }

  /**
   * Returns the tooltip composed of text and keyboard shortcut.
   * Example: `"Guardar (F4)"`.
   */
  get tooltip(): string {
    return `${this.buttonLabel}${this.shortcut ? ' (' + this.shortcut + ')' : ''}`;
  }

  /**
   * Returns the dynamic background color based on type or custom color.
   */
  get bgColor(): string {
    if (this.type === 'custom' && this.color) return `var(${this.color})`;
    return this.presets[this.type].bg || 'transparent';
  }

  /**
   * Returns the dynamic text color based on type or custom override.
   */
  get textColor(): string {
    if (this.type === 'custom' && this.customTextColor) return `var(${this.customTextColor})`;
    return this.presets[this.type].textColor || 'var(--on-primary)';
  }

  /**
   * Returns the border style dynamically depending on type or custom setting.
   */
  get borderStyle(): string {
    if (this.type === 'custom' && this.borderColor) {
      return this.borderColor ? `1px solid var(${this.borderColor})` : '';
    }
    return this.presets[this.type].border;
  }

  /**
   * Emits the `pressed` event when the button is clicked.
   */
  onClick(event: MouseEvent): void {
    this.pressed.emit(event);
  }

  /**
   * Listens globally for keyboard shortcuts (F1, F2, F3, etc.)
   * and triggers the button action if the corresponding key is pressed.
   * Note: F5 is intentionally allowed for browser refresh functionality.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const shortcut = this.presets[this.type].key;
    
    // Allow F5 to work as browser refresh (don't intercept it)
    if (event.key === 'F5') {
      return;
    }
    
    if (shortcut && event.key === shortcut && !this.disabled) {
      event.preventDefault();
      this.pressed.emit(event);
    }
  }
}
