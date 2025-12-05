
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericFormField } from '../../../../shared/components/generic-form/generic-form.component';
import { LoginFormComponent } from '../../../../shared/components/login-form/login-form.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PasswordResetService } from '../../services/password-reset.service';

/**
 * Component to request a password recovery.
 * Allows the user to enter their email to receive a recovery link.
 */
@Component({
  selector: 'app-internal-user-password-recover',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    GenericAlertComponent,
    GenericButtonComponent,
    LoginFormComponent,
    SpinnerComponent
  ],
  standalone: true,
  templateUrl: './internal-user-password-recover.component.html',
  styleUrl: './internal-user-password-recover.component.css'
})
export class InternalUserPasswordRecoverComponent {

  private passwordResetService = inject(PasswordResetService);
  private errorHandler = inject(ErrorHandlerService);

  // Alert properties
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';

  loading = false;
  emailSent = false;
  submittedEmail = '';

  protected formFields: GenericFormField[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Ingresa tu correo electrónico',
      colSpan: 4,
      messages: {
        required: 'El correo electrónico es requerido',
        email: 'Por favor ingresa un correo electrónico válido'
      }
    }
  ];

  /**
   * Handles the password recovery form submission.
   * Receives form data from GenericFormComponent and sends a request to the backend.
   * @param formData - The form data containing the email
   */
  onSubmit(formData: any): void {
    // Only 'email' is expected in the form data as per formFields definition
    const email = formData?.email ?? '';
    this.submittedEmail = email;
    this.loading = true;

    this.passwordResetService.forgotPassword(email).subscribe({
      next: (response) => {
        this.loading = false;
        this.emailSent = true;
        this.showAlert = true;
        this.alertMessage = response;
        this.alertType = 'success';
        this.hideAlertAfterDelay();
      },
      error: (error) => {
        this.loading = false;
        this.alertMessage = this.errorHandler.getErrorMessage(
          error,
          'No se pudo enviar el email de recuperación. Por favor, intenta nuevamente.'
        );
        this.alertType = 'error';
        this.showAlert = true;
        this.hideAlertAfterDelay();
      }
    });
  }

  /**
   * Hides the alert after a delay
   */
  private hideAlertAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.showAlert = false;
    }, delay);
  }

  /**
   * Resets the UI state to allow sending another email
   */
  onFormCancel(): void {
    this.emailSent = false;
    this.submittedEmail = '';
    this.showAlert = false;
  }
}
