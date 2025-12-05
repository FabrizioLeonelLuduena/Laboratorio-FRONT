import { Injectable, inject } from '@angular/core';

import { DialogService } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';

import { take } from 'rxjs/operators';

import { PrimeModalComponent, GenericModalData } from './prime-modal.component';

/**
 * Timeout in milliseconds for modal fallback to ensure Observable completion.
 * This prevents hanging subscriptions if the modal doesn't emit properly.
 * Increased to allow users sufficient time to read and interact with modals.
 */
const MODAL_COMPLETION_FALLBACK_TIMEOUT = 300000; // 5 min

/**
 * PrimeModalService provides methods to display various types of modal dialogs for user feedback and confirmation.
 * It wraps the PrimeNG DialogService and offers convenient methods for common modal scenarios.
 */
@Injectable({
  providedIn: 'root'
})
export class PrimeModalService {
  /**
   * DialogService instance for opening modal dialogs.
   */
  private dialogService = inject(DialogService);

  /**
   * Displays a generic modal with custom configuration.
   * @param data - The configuration and content for the modal
   * @param width - Optional width of the modal dialog
   * @param timeout - Optional timeout in milliseconds before auto-completing (default: 5 minutes)
   * @returns Observable<any> that resolves when the modal is closed
   */
  show(data: GenericModalData, width: string = '480px', timeout: number = MODAL_COMPLETION_FALLBACK_TIMEOUT): Observable<any> {
    const ref = this.dialogService.open(PrimeModalComponent, {
      header: data.title,
      width,
      data,
      modal: true,
      closable: !data.autoClose,
      dismissableMask: !data.autoClose
    });

    if (!ref || !ref.onClose) {
      return new Observable<any>((observer) => {
        observer.next(false);
        observer.complete();
      });
    }

    return new Observable<any>((observer) => {
      let emitted = false;
      let timeoutId: any;

      const subscription = ref.onClose.pipe(take(1)).subscribe((result) => {
        if (!emitted) {
          if (data.type === 'info') {
            observer.next(result === true);
          } else {
            observer.next(result);
          }
          emitted = true;
          observer.complete();
          subscription.unsubscribe();


          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      });


      timeoutId = setTimeout(() => {
        if (!emitted) {
          observer.next(false);
          emitted = true;
          observer.complete();
          subscription.unsubscribe();
        }
      }, timeout);
    });
  }


  /**
   * Displays a confirmation modal with customizable buttons and severity.
   * @param title - The title of the modal
   * @param message - The message to display
   * @param confirmText - Text for the confirm button
   * @param cancelText - Text for the cancel button
   * @param severity - Visual severity of the confirm button
   * @returns Observable<boolean> that resolves with the user's choice
   */
  confirm(
    title: string,
    message: string,
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar',
    severity: 'primary' | 'danger' | 'warn' = 'primary'
  ): Observable<boolean> {
    return this.show({
      type: 'confirm',
      title,
      message,
      actions: [
        { label: cancelText, severity: 'secondary', returnValue: false },
        { label: confirmText, severity, returnValue: true }
      ]
    });
  }

  /**
   * Displays a success modal, optionally auto-closing after a timeout.
   * @param title - The title of the modal
   * @param message - The message to display
   * @param autoClose - Whether the modal should close automatically
   * @param autoCloseTime - Time in milliseconds before auto-close
   * @returns Observable<void> that resolves when the modal is closed
   */
  success(
    title: string,
    message: string,
    autoClose: boolean = false,
    autoCloseTime: number = 2000
  ): Observable<void> {
    return this.show({
      type: 'success',
      title,
      message,
      autoClose,
      autoCloseTime
    });
  }

  /**
   * Displays an error modal.
   * @param title - The title of the modal
   * @param message - The error message to display
   * @returns Observable<void> that resolves when the modal is closed
   */
  error(title: string, message: string): Observable<void> {
    return this.show({
      type: 'error',
      title,
      message
    });
  }

  /**
   * Displays a warning modal.
   * @param title - The title of the modal
   * @param message - The warning message to display
   * @returns Observable<void> that resolves when the modal is closed
   */
  warning(title: string, message: string): Observable<void> {
    return this.show({
      type: 'warning',
      title,
      message
    });
  }

  /**
   * Displays an informational modal.
   * @param title - The title of the modal
   * @param message - The information message to display
   * @returns Observable<void> that resolves when the modal is closed
   */
  info(title: string, message: string): Observable<void> {
    return this.show({
      type: 'info',
      title,
      message
    });
  }

  /**
   * Displays a confirmation modal with additional details for context.
   * @param title - The title of the modal
   * @param message - The message to display
   * @param additionalInfo - Array of additional information rows
   * @param confirmText - Text for the confirm button
   * @param cancelText - Text for the cancel button
   * @param severity - Visual severity of the confirm button
   * @returns Observable<boolean> that resolves with the user's choice
   */
  confirmWithDetails(
    title: string,
    message: string,
    additionalInfo: { label: string; value: string }[],
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar',
    severity: 'primary' | 'danger' | 'warn' = 'primary'
  ): Observable<boolean> {
    return this.show({
      type: 'confirm',
      title,
      message,
      additionalInfo,
      actions: [
        { label: cancelText, severity: 'secondary', returnValue: false },
        { label: confirmText, severity, returnValue: true }
      ]
    });
  }
}
