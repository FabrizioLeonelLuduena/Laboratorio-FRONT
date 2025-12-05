import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

/**
 * Type definition for alert types.
 * Represents the possible visual styles and semantic meanings of alerts.
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 * @component GenericAlertComponent
 *
 * Generic alert component that uses global CSS styles.
 * Displays success, error, warning, or informational messages with icons
 * and integrates with the color scheme and styles defined in `styles.css`.
 *
 * This component is designed to be reusable across the application and
 * easily configurable via its input properties.
 *
 * @example
 * ```html
 * <app-generic-alert
 *   type="success"
 *   title="Operation completed"
 *   text="The record was successfully saved."
 * ></app-generic-alert>
 * ```
 */
@Component({
  selector: 'app-generic-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-alert.component.html',
  styleUrls: ['./generic-alert.component.css']
})
export class GenericAlertComponent implements OnInit, OnDestroy {
  /**
   * Alert title (if none is provided, a default one in Spanish will be generated).
   * @default ''
   */
  @Input() title: string = '';

  /**
   * Descriptive text of the alert.
   * @default ''
   */
  @Input() text: string = '';

  /**
   * Alias for `text` (for backward compatibility with other components or templates).
   * @default ''
   */
  @Input() message: string = '';

  /**
   * Type of alert that determines icon, color, and tone.
   * Can be one of: `'success' | 'error' | 'warning' | 'info'`.
   * @default 'info'
   */
  @Input() type: AlertType = 'info';

  /**
   * Duration in milliseconds before the alert auto-dismisses.
   * Set to 0 to disable auto-dismiss.
   * @default 3000 (3 seconds)
   */
  @Input() autoDismiss: number = 3000;

  /**
   * Event emitted when the alert is dismissed (auto or manual).
   */
  @Output() dismissed = new EventEmitter<void>();

  private dismissTimer?: ReturnType<typeof setTimeout>;

  /**
   * Lifecycle hook executed once after component initialization.
   * Assigns default Spanish titles based on the alert type if none is provided.
   * Sets up auto-dismiss timer if configured.
   */
  ngOnInit(): void {
    if (!this.title) {
      switch (this.type) {
      case 'success':
        this.title = 'Éxito';
        break;
      case 'error':
        this.title = 'Error';
        break;
      case 'warning':
        this.title = 'Advertencia';
        break;
      case 'info':
        this.title = 'Información';
        break;
      }
    }

    // Setup auto-dismiss timer
    if (this.autoDismiss > 0) {
      this.dismissTimer = setTimeout(() => {
        this.dismissed.emit();
      }, this.autoDismiss);
    }
  }

  /**
   * Cleanup timer on component destruction
   */
  ngOnDestroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }
}
