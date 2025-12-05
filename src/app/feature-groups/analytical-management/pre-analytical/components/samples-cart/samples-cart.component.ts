import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, model, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { TranslateStatusPipe } from '../../../../../shared/pipes/translate-status.pipe';
import { CartItem } from '../../models/label.interface';

/**
 * Component for managing the samples cart dialog
 * Displays protocols with their scanned labels and completion status
 */
@Component({
  selector: 'app-samples-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    GenericButtonComponent,
    GenericModalComponent,
    TranslateStatusPipe
  ],
  providers: [],
  templateUrl: './samples-cart.component.html',
  styleUrl: './samples-cart.component.css'
})
export class SamplesCartComponent {
  @Input() cart: CartItem[] = [];
  @Input() loading = false;

  visible = model<boolean>(false);

  @Output() register = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() removeProtocol = new EventEmitter<string>();
  @Output() cartChange = new EventEmitter<CartItem[]>();

  /**
   * Gets total count of samples in cart
   */
  get cartLabelsCount(): number {
    return this.cart.reduce((sum, item) => sum + item.selectedIds.length, 0);
  }

  /**
   * Gets count of complete protocols (all labels scanned)
   */
  get completeProtocolsCount(): number {
    return this.cart.filter(item => item.isComplete).length;
  }

  /**
   * Gets count of incomplete protocols
   */
  get incompleteProtocolsCount(): number {
    return this.cart.filter(item => !item.isComplete).length;
  }

  /**
   * Checks if all protocols in cart are complete
   */
  get allProtocolsComplete(): boolean {
    return this.cart.length > 0 && this.cart.every(item => item.isComplete);
  }

  /**
   * Emits event to remove a protocol from the cart
   * @param protocol - The protocol number to remove
   */
  onRemoveProtocol(protocol: string) {
    this.removeProtocol.emit(protocol);
  }

  /**
   * Emits event to clear all items from the cart
   */
  onClearCart() {
    this.clearAll.emit();
  }

  /**
   * Validates and emits event to register selected samples
   */
  onRegister() {
    if (!this.allProtocolsComplete) {
      return;
    }
    this.register.emit();
  }

  /**
   * Gets display status for a cart item
   */
  getStatusDisplay(item: CartItem): string {
    return item.isComplete ? 'Completo' : 'Incompleto';
  }

  /**
   * Gets CSS class for status badge
   */
  getStatusClass(item: CartItem): string {
    return item.isComplete ? 'status-complete' : 'status-incomplete';
  }

  /**
   * Closes the cart dialog
   */
  onClose() {
    this.visible.set(false);
  }
}
