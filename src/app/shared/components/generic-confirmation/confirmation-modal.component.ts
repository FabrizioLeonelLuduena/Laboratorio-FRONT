import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GenericButtonComponent } from '../generic-button/generic-button.component';

/**
 * @component ConfirmationModalComponent
 *
 * Reusable and standardized confirmation modal component.
 * It uses the global CSS theme and integrates generic buttons (`Cancel` and `Accept`).
 * Optionally, it can project custom content through `<ng-content>`.
 *
 * Designed to handle confirmation workflows (such as deleting, saving, or exiting)
 * in a consistent and accessible way across the application.
 *
 * @example
 * ```html
 * <app-confirmation-modal
 *   [title]="'Delete record'"
 *   [message]="'Are you sure you want to delete this item?'"
 *   (confirmed)="onDeleteConfirmed()"
 *   (dismissed)="onModalClosed()"
 * ></app-confirmation-modal>
 * ```
 */
@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, GenericButtonComponent],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ConfirmationModalComponent {
  /**
   * Main icon displayed in the modal header.
   * Uses PrimeIcons (e.g., `pi pi-exclamation-triangle`).
   * @default 'pi pi-exclamation-triangle'
   */
  @Input() icon: string = 'pi pi-exclamation-triangle';

  /**
   * Modal title text displayed at the top.
   * @default 'Confirmar acción'
   */
  @Input() title: string = 'Confirmar acción';

  /**
   * Descriptive message explaining the action to be confirmed.
   * @default '¿Estás seguro de que deseas continuar?'
   */
  @Input() message: string = '¿Estás seguro de que deseas continuar?';

  /**
   * Whether the modal should render additional projected content.
   * When true, `<ng-content>` is displayed below the message.
   * @default false
   */
  @Input() showContent: boolean = false;

  /**
   * Optional configuration for an input field inside the modal.
   * Can be used to require confirmation text or comments.
   *
   * @example
   * ```typescript
   * inputField = {
   *   label: 'Please type CONFIRM to proceed',
   *   placeholder: 'Type here...',
   *   required: true,
   *   type: 'text'
   * };
   * ```
   */
  @Input() inputField?: {
    label: string;
    placeholder: string;
    required: boolean;
    type?: 'text' | 'textarea';
  };

  /**
   * Bound value of the optional input field.
   */
  inputValue: string = '';

  /**
   * Event emitted when the user confirms the action.
   * If an input field exists, the emitted value is the input content.
   * Otherwise, emits `void`.
   */
  @Output() confirmed = new EventEmitter<string | void>();

  /**
   * Event emitted when the user cancels or closes the modal.
   */
  @Output() dismissed = new EventEmitter<void>();

  /**
   * Closes the modal and resets the input value.
   * Emits the `dismissed` event.
   */
  onClose(): void {
    this.inputValue = '';
    this.dismissed.emit();
  }

  /**
   * Confirms the action.
   * Emits `confirmed` with the input value if applicable,
   * otherwise emits a void event.
   */
  onAccept(): void {
    if (this.inputField) {
      this.confirmed.emit(this.inputValue);
      this.inputValue = '';
    } else {
      this.confirmed.emit();
    }
  }

  /**
   * Determines whether the "Accept" button should be disabled.
   * If an input field is required and empty, returns `true`.
   *
   * @returns {boolean} True if the accept button should be disabled.
   */
  isAcceptDisabled(): boolean {
    if (this.inputField?.required) {
      return !this.inputValue.trim();
    }
    return false;
  }
}
