import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

/**
 * PrimeModalComponent displays a unified modal dialog for confirmations, feedback, and information.
 * It supports multiple variants (info, success, warning, error, confirm) and customizable actions.
 * The component is responsible for rendering modal content, handling user actions, and auto-closing if configured.
 */
@Component({
  selector: 'app-generic-modal',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="modal-content">
      <!-- Icon -->
      <div class="modal-icon" [ngClass]="getIconContainerClass()">
        <i [class]="'pi ' + getIconClass()" [ngClass]="getIconColorClass()"></i>
      </div>

      <!-- Message -->
      <div class="modal-message">
        <p>{{ data.message }}</p>
      </div>

      <!-- Additional Info -->
      <div *ngIf="data.additionalInfo && data.additionalInfo.length > 0" class="additional-info">
        <div *ngFor="let info of data.additionalInfo" class="info-row">
          <span class="info-label">{{ info.label }}:</span>
          <span class="info-value">{{ info.value }}</span>
        </div>
      </div>

      <!-- Actions -->
      @if (!data.autoClose) {
        <div class="modal-actions">
          <p-button
            *ngFor="let action of getActions()"
            [label]="action.label"
            [severity]="action.severity || 'primary'"
            [outlined]="action.outlined || false"
            [loading]="isProcessing"
            [disabled]="isProcessing"
            (onClick)="onAction(action)">
          </p-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .modal-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    .modal-icon {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-icon i {
      font-size: 2rem;
    }

    .icon-info { background-color: #e3f2fd; }
    .icon-success { background-color: #e8f5e9; }
    .icon-warning { background-color: #fff3e0; }
    .icon-error { background-color: #ffebee; }
    .icon-confirm { background-color: #e3f2fd; }

    .icon-color-info { color: #2196f3; }
    .icon-color-success { color: #4caf50; }
    .icon-color-warning { color: #ff9800; }
    .icon-color-error { color: #f44336; }
    .icon-color-confirm { color: #2196f3; }

    .modal-message {
      text-align: center;
      color: #495057;
      font-size: 1rem;
      line-height: 1.5;
    }

    .additional-info {
      width: 100%;
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }

    .info-label {
      color: #6c757d;
      font-weight: 500;
    }

    .info-value {
      color: #212529;
      font-weight: 600;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      justify-content: center;
    }

    .modal-actions p-button {
      flex: 0 1 auto;
    }
  `]
})
export class PrimeModalComponent {
  /**
   * Reference to the dialog instance, used to close the modal programmatically.
   */
  private dialogRef = inject(DynamicDialogRef);

  /**
   * Configuration object containing modal data and options.
   */
  public config = inject(DynamicDialogConfig<GenericModalData>);
  
  /**
   * Flag to prevent multiple clicks on action buttons
   */
  public isProcessing = false;

  /**
   * Creates the modal component and sets up auto-close if configured.
   * If autoClose and autoCloseTime are set, closes the modal after the specified time.
   */
  constructor() {
    // Auto-close if configured
    if (this.data.autoClose && this.data.autoCloseTime) {
      setTimeout(() => {
        this.dialogRef.close();
      }, this.data.autoCloseTime);
    }
  }

  /**
   * Returns the modal configuration data provided to the dialog.
   * @returns {GenericModalData} The configuration and content for the modal.
   */
  get data(): GenericModalData {
    return this.config.data!;
  }

  /**
   * Gets the icon class based on the modal type for visual feedback.
   * @returns {string} CSS class for the icon.
   */
  getIconClass(): string {
    switch (this.data.type) {
    case 'success':
      return 'pi-check-circle';
    case 'error':
      return 'pi-times-circle';
    case 'warning':
      return 'pi-exclamation-triangle';
    case 'confirm':
      return 'pi-question-circle';
    default:
      return 'pi-info-circle';
    }
  }

  /**
   * Gets the container class for the icon based on the modal type.
   * @returns {string} CSS class for the icon container.
   */
  getIconContainerClass(): string {
    return `icon-${this.data.type}`;
  }

  /**
   * Gets the color class for the icon based on the modal type.
   * @returns {string} CSS class for the icon color.
   */
  getIconColorClass(): string {
    return `icon-color-${this.data.type}`;
  }

  /**
   * Returns the set of actions to display in the modal, using defaults if none are provided.
   * @returns {ModalAction[]} Array of action button configurations for the modal.
   */
  getActions(): ModalAction[] {
    if (this.data.actions && this.data.actions.length > 0) {
      return this.data.actions;
    }

    // Default actions based on type
    if (this.data.type === 'confirm') {
      return [
        { label: 'Cancelar', severity: 'secondary', returnValue: false },
        { label: 'Confirmar', severity: 'primary', returnValue: true }
      ];
    }

    // Default single action for feedback modals
    const severityMap: { [key: string]: ModalAction['severity'] } = {
      'success': 'success',
      'error': 'danger',
      'warning': 'warn',
      'info': 'info'
    };

    return [{
      label: this.data.type === 'error' ? 'Entendido' : 'Aceptar',
      severity: severityMap[this.data.type] || 'primary',
      returnValue: true
    }];
  }

  /**
   * Handles user clicks on modal action buttons and closes the dialog with the selected value.
   * @param {ModalAction} action - The action selected by the user
   */
  onAction(action: ModalAction): void {
    // ✅ Prevenir múltiples clicks
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    // Cerrar modal con el valor de retorno
    this.dialogRef.close(action.returnValue ?? true);
    
    // Reset flag después de un pequeño delay
    setTimeout(() => {
      this.isProcessing = false;
    }, 500);
  }
}

/**
 * Describes a button/action configuration for the modal dialog.
 * Used to customize the modal's available actions and their appearance.
 */
export interface ModalAction {
  /**
   * The label displayed on the button.
   */
  label: string;
  /**
   * The visual severity/style of the button (e.g., primary, success, danger).
   */
  severity?: 'primary' | 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | 'help';
  /**
   * Whether the button is outlined for visual emphasis.
   */
  outlined?: boolean;
  /**
   * The value returned when the action is selected.
   */
  returnValue?: any;
}

/**
 * Describes a key-value pair of additional information to display in the modal.
 * Used for showing extra context or details to the user.
 */
export interface ModalInfo {
  /**
   * The label for the information row.
   */
  label: string;
  /**
   * The value associated with the label.
   */
  value: string;
}

/**
 * Configuration object for the generic modal dialog.
 * Specifies the type, content, actions, and auto-close behavior.
 */
export interface GenericModalData {
  /**
   * The type of modal (info, success, warning, error, confirm) which determines its appearance.
   */
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  /**
   * The title displayed at the top of the modal.
   */
  title: string;
  /**
   * The main message or content of the modal.
   */
  message: string;
  /**
   * Array of action button configurations for user interaction.
   */
  actions?: ModalAction[];
  /**
   * Array of additional information rows to display for extra context.
   */
  additionalInfo?: ModalInfo[];
  /**
   * If true, the modal will close automatically after autoCloseTime milliseconds.
   */
  autoClose?: boolean;
  /**
   * The time in milliseconds before the modal auto-closes (if enabled).
   */
  autoCloseTime?: number;
}
