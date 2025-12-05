import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GenericButtonComponent } from '../generic-button/generic-button.component';

/**
 * a generic header card
 */
@Component({
  selector: 'app-generic-header-card',
  standalone: true,
  imports: [CommonModule, GenericButtonComponent, TitleCasePipe],
  templateUrl: './generic-header-card.component.html',
  styleUrls: ['./generic-header-card.component.css']
})
export class GenericHeaderCardComponent {
  @Input() title: string = '';
  @Input() optionalButtonText: string = '';
  @Input() optionalButtonIcon: string = '';
  @Input() showOptionalButton: boolean = false;
  @Input() showBackButton: boolean = true;
  @Input() returnButton: boolean = true;

  @Output() backPressed = new EventEmitter<void>();
  @Output() optionalButtonPressed = new EventEmitter<void>();

  /**
   * Event for return button press.
   */
  toReturn(): void {
    this.backPressed.emit();
  }

  /**
   * Event for optional button press.
   */
  onOptionalButtonPress(): void {
    this.optionalButtonPressed.emit();
  }
}
