import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { LoginFormComponent } from 'src/app/shared/components/login-form/login-form.component';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericFormField } from '../../../../shared/components/generic-form/generic-form.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PasswordResetService } from '../../services/password-reset.service';

/**
 * Interface for password reset form data
 */
interface PasswordResetFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Component for password reset page.
 *
 * Receives the token via URL and allows the user to enter a new password.
 */
@Component({
  selector: 'app-password-reset',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    GenericAlertComponent,
    GenericButtonComponent,
    LoginFormComponent,
    SpinnerComponent
  ],
  standalone: true,
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css'
})
export class PasswordResetComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private passwordResetService = inject(PasswordResetService);
  private authService = inject(AuthService);
  private errorHandler = inject(ErrorHandlerService);
  private destroy$ = new Subject<void>();

  // Alert properties
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';

  loading = false;
  loadingMessage = 'Validando token...';
  tokenError = false;
  passwordChanged = false;
  token = '';
  isFirst = false; // indicates first login flow

  /**
   * Validator for matching passwords
   */
  protected readonly passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  protected formFields: GenericFormField[] = [
    {
      name: 'password',
      label: 'Nueva Contraseña',
      type: 'password',
      required: true,
      placeholder: 'Ingresa tu nueva contraseña',
      colSpan: 4,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,30}$',
      messages: {
        required: 'La contraseña es requerida',
        pattern: 'Debe tener entre 8 y 30 caracteres, con mayúscula, minúscula, número y un símbolo especial (@#$%^&+=!)'
      }
    },
    {
      name: 'confirmPassword',
      label: 'Confirmar Contraseña',
      type: 'password',
      required: true,
      placeholder: 'Confirma tu nueva contraseña',
      colSpan: 4,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,30}$',
      messages: {
        required: 'Debes confirmar la contraseña',
        pattern: 'Debe tener entre 8 y 30 caracteres, con mayúscula, minúscula, número y un símbolo especial (@#$%^&+=!)'
      },
      formValidatorMessages: {
        passwordMismatch: 'Las contraseñas no coinciden'
      }
    }
  ];

  /**
   * Inits the component taking the token from the URL and validating it's not null
   */
  ngOnInit(): void {
    this.isFirst = this.route.snapshot.queryParamMap.get('first') === 'true';

    if (this.isFirst) {
      // For first login prefer first-login token in localStorage or query param, but sanitize it
      const firstLoginTokenRaw = localStorage.getItem('firstLoginToken');
      const qpTokenRaw = this.route.snapshot.queryParamMap.get('firstLoginToken') || this.route.snapshot.queryParamMap.get('token');
      const sanitize = (t?: string | null) => (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') ? t : null;
      const firstLoginToken = sanitize(firstLoginTokenRaw);
      const qpToken = sanitize(qpTokenRaw);
      this.token = firstLoginToken || qpToken || '';
      // token selected: we prefer the one stored in localStorage (firstLoginToken),
      // if it doesn't exist we use the token from query params (firstLoginToken)

      // show alert and continue (the submit will use this.token)
      this.loading = false;
      this.showAlert = true;
      this.alertType = 'warning';
      this.alertMessage = 'Por seguridad, debes cambiar tu contraseña antes de continuar.';
      return;
    }

    // normal flow: token comes from query param (sanitize it)
    const qpToken2 = this.route.snapshot.queryParamMap.get('token');
    this.token = (qpToken2 && qpToken2 !== 'null' && qpToken2 !== 'undefined' && qpToken2.trim() !== '') ? qpToken2 : '';

    // if it's not first login, ensure we have a token to validate
    if (!this.token) {
      // No token after sanitization -> redirect to login
      this.tokenError = true;
      this.showAlert = true;
      this.alertMessage = 'Token no proporcionado. El enlace es inválido.';
      this.alertType = 'error';
      // navigate to login after showing alert briefly
      setTimeout(() => {
        window.location.href = '/login';
      }, 800);
      return;
    }

    // validate normal token
    this.validateToken();
  }

  /**
   * Validates the token with the backend
   */
  validateToken(): void {
    this.loading = true;
    this.loadingMessage = 'Validando token...';
    this.passwordResetService.validateToken(this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.tokenError = true;
          this.alertMessage = this.errorHandler.getErrorMessage(
            error,
            'El enlace de restablecimiento no es válido. Por favor, solicita un nuevo enlace.'
          );
          this.alertType = 'error';
          this.showAlert = true;
        }
      });
  }

  /**
   * Sends the new password to the backend to reset it
   * @param formData - Data from the form submitted
   */
  onSubmit(formData: PasswordResetFormData): void {
    const newPassword = formData.password;

    this.loading = true;
    this.loadingMessage = 'Cambiando contraseña...';
    // If it's first login, call the specific endpoint
    if (this.isFirst) {
      this.passwordResetService.setPasswordFirstLogin(newPassword, this.token)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.passwordChanged = true;
            this.alertMessage = response;
            this.alertType = 'success';
            this.showAlert = true;

            // Mark first-login completed in AuthService (updates stored user and clears token)
            this.authService.markFirstLoginCompleted();

            // After a short delay, redirect to dashboard
            setTimeout(() => {
              this.authService.redirectToDashboard();
            }, 2000);
          },
          error: (error) => {
            this.loading = false;
            this.alertMessage = this.errorHandler.getErrorMessage(
              error,
              'No se pudo cambiar la contraseña. Por favor, intenta nuevamente.'
            );
            this.alertType = 'error';
            this.showAlert = true;
            this.hideAlertAfterDelay();
          }
        });
      return;
    }

    // normal flow: reset password with token
    this.passwordResetService.resetPassword(this.token, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.passwordChanged = true;
          this.alertMessage = response;
          this.alertType = 'success';
          this.showAlert = true;
          // Redirects to login after 5 seconds
          setTimeout(() => {
            window.location.href = '/login';
          }, 5000);
        },
        error: (error) => {
          this.loading = false;
          this.alertMessage = this.errorHandler.getErrorMessage(
            error,
            'No se pudo cambiar la contraseña. Por favor, intenta nuevamente.'
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
   * Cleans up pending subscriptions when the component is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
