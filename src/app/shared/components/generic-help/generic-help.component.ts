import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { GenericModalComponent } from '../generic-modal/generic-modal.component';

/**
 * @component GenericHelpComponent
 *
 * Generic contextual help component.
 * Displays a floating button with a question mark icon that, when clicked,
 * opens a modal containing help information, usage instructions, or tips
 * related to the current view.
 *
 * It integrates seamlessly with the `GenericModalComponent` for consistency
 * across the application and supports flexible positioning for floating layouts.
 *
 * @example
 * ```html
 * <app-generic-help
 *   title="Coverage Management Help"
 *   content="<p>Here you can manage the coverages associated with each plan...</p>"
 *   position="bottom-right">
 * </app-generic-help>
 * ```
 */
@Component({
  selector: 'app-generic-help',
  standalone: true,
  imports: [CommonModule, GenericModalComponent],
  templateUrl: './generic-help.component.html',
  styleUrls: ['./generic-help.component.css']
})
export class GenericHelpComponent {
  /**
   * Controls the visibility state of the help modal.
   * When `true`, the modal is displayed.
   * @default false
   */
  visible: boolean = false;

  /**
   * Title displayed at the top of the modal window.
   * @default 'User Guide'
   */
  @Input() title: string = 'Guía de usuario';

  /**
   * Help content displayed within the modal.
   * Can contain plain text or HTML markup.
   * @default 'Aquí podés colocar información de ayuda o instrucciones para esta vista.'
   */
  @Input() content: string = 'Aquí podés colocar información de ayuda o instrucciones para esta vista.';

  /**
   * Defines the floating position of the help button.
   * Can be one of:
   * - `'bottom-right'` → Floating button on bottom right corner
   * - `'bottom-left'` → Floating button on bottom left corner
   * - `'static'` → Button positioned inline with the content
   *
   * @default 'bottom-right'
   */
  @Input() position: 'bottom-right' | 'bottom-left' | 'static' = 'bottom-right';

  /**
   * Opens the help modal.
   * Sets `visible` to `true`.
   */
  openHelp(): void {
    this.visible = true;
  }

  /**
   * Closes the help modal.
   * Sets `visible` to `false`.
   */
  closeHelp(): void {
    this.visible = false;
  }
}
