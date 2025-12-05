import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { EmailVerificationService } from '../../services/email-verification.service';
import { ErrorHandlerService } from '../../services/error-handler.service';



/**
 * Component to verify the user's email
 * Receives the token via URL and automatically verifies the email
 */
@Component({
  selector: 'app-email-verification',
  imports: [
    RouterModule,
    GenericAlertComponent,
    GenericButtonComponent,
    SpinnerComponent
  ],
  standalone: true,
  templateUrl: './email-verification.component.html',
  styleUrl: './email-verification.component.css'
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private emailVerificationService = inject(EmailVerificationService);
  private errorHandler = inject(ErrorHandlerService);
  private destroy$ = new Subject<void>();

  // Alert properties
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';

  loading = false;
  loadingMessage = 'Verificando email...';
  tokenError = false;
  emailVerified = false;

  token = '';

  /**
   * The component starts by taking the token from the URL and verifying the email
   */
  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.tokenError = true;
      this.showAlert = true;
      this.alertMessage = 'Token no proporcionado. El enlace es inválido.';
      this.alertType = 'error';
      return;
    }

    this.verifyEmail();
  }

  /**
   * Verify the email with the backend
   */
  verifyEmail(): void {
    this.loading = true;
    this.loadingMessage = 'Verificando tu email...';

    this.emailVerificationService.verifyEmail(this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.emailVerified = true;
          this.alertMessage = '¡Tu email ha sido verificado exitosamente!';
          this.alertType = 'success';
          this.showAlert = true;
          this.hideAlertAfterDelay(10000);
        },
        error: (error) => {
          this.loading = false;
          this.tokenError = true;
          this.alertMessage = this.errorHandler.getErrorMessage(
            error,
            'No se pudo verificar el email. Por favor, intenta nuevamente.'
          );
          this.alertType = 'error';
          this.showAlert = true;
        }
      });
  }

  /**
   * Hide the alert after a delay
   */
  private hideAlertAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.showAlert = false;
    }, delay);
  }

  /**
   * Clean up subscriptions by destroying the component
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
