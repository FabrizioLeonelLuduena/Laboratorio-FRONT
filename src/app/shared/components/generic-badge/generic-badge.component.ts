import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * @component GenericBadgeComponent
 *
 * Generic badge component used to represent entity statuses
 * such as **Active**, **Inactive**, or **Pending**.
 * It uses standardized system colors and can optionally display
 * a custom label text.
 *
 * The badge style and color are dynamically determined based on the
 * current status (`activo`, `inactivo`, or `pendiente`).
 *
 * @example
 * ```html
 * <app-generic-badge status="activo"></app-generic-badge>
 * <app-generic-badge status="pendiente" text="Processing"></app-generic-badge>
 * ```
 */
@Component({
  selector: 'app-generic-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-badge.component.html',
  styleUrls: ['./generic-badge.component.css']
})
export class GenericBadgeComponent {
  /**
   * Status type of the badge.
   * Determines the visual style and color scheme.
   * Can be one of: `'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado'`.
   * @default 'activo'
   */
  @Input() status: 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' = 'activo';

  /**
   * Optional custom label text.
   * If not provided, the component will use the status name as the label.
   * @example
   * text="Available"
   */
  @Input() text?: string;

  /**
   * Returns the final text displayed inside the badge.
   * If `text` is provided, it takes precedence over the default status label.
   *
   * @returns The final label text in uppercase.
   */
  get label(): string {
    if (this.text) {
      return this.text;
    }

    const value = this.text ?? this.status;
    return value.toUpperCase();
  }

  /**
   * Dynamically generates the CSS class name based on the current status.
   * This allows the badge to automatically adapt its color and style.
   *
   * @returns A string representing the complete class name.
   * @example
   * // When status = 'activo'
   * // Returns: 'badge badge--activo'
   */
  get badgeClass(): string {
    return `badge badge--${this.status}`;
  }
}
