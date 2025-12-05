import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, ViewEncapsulation } from '@angular/core';

/**
 * @component GenericModalComponent
 *
 * Generic and adaptable modal component.
 * Serves as a visual base for forms or dynamic views that require
 * modal presentation. It replicates the look and behavior of the
 * confirmation modal but allows fully customizable content projection.
 *
 * The component supports dynamic sizing (width/height) and emits an event
 * when closed either by clicking the close icon or pressing the ESC key.
 *
 * @example
 * ```html
 * <app-generic-modal-form
 *   [visible]="isModalVisible"
 *   [title]="'Edit Coverage'"
 *   [width]="'600px'"
 *   (closed)="onCloseModal()">
 *   <form> ... </form>
 * </app-generic-modal-form>
 * ```
 */
@Component({
  selector: 'app-generic-modal-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-modal.component.html',
  styleUrls: ['./generic.modal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GenericModalComponent {
  /**
   * Controls the visibility of the modal window.
   * When `true`, the modal is displayed.
   * @default false
   */
  @Input() visible = false;

  /**
   * Title displayed in the modal header.
   * @default 'Modal Title'
   */
  @Input() title = 'Título del modal';

  /**
   * Width of the modal.
   * Accepts fixed or responsive values such as:
   * - `'auto'`
   * - `'420px'`
   * - `'80vw'`
   * @default '420px'
   */
  @Input() width = '420px';

  /**
   * Height of the modal.
   * Accepts fixed or relative values such as:
   * - `'auto'`
   * - `'400px'`
   * - `'70vh'`
   * @default 'auto'
   */
  @Input() height: string = 'auto';

  /**
   * Event emitted when the modal is closed.
   * Triggered by clicking the close button or pressing the ESC key.
   */
  @Output() closed = new EventEmitter<void>();

  /**
   * Closes the modal by emitting the `closed` event.
   */
  onClose(): void {
    this.closed.emit();
  }

  /**
   * Listens for the ESC key press globally and closes the modal if visible.
   */
  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.visible) this.onClose();
  }
}
