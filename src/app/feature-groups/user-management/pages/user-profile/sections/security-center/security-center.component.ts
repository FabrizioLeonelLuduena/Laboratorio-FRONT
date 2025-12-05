import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal, OnInit } from '@angular/core';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { UserResponse } from 'src/app/feature-groups/user-management/models/login-model';

import { ErrorHandlerService } from '../../../../services/error-handler.service';
import { PasswordResetService } from '../../../../services/password-reset.service';

/**
 * SecurityCenterComponent
 * Manages security-related settings for the user account.
 * Provides password change, session management, and security status.
 */
@Component({
  selector: 'app-security-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-center.component.html',
  styleUrls: ['./security-center.component.css']
})
export class SecurityCenterComponent implements OnInit {
  @Input({ required: true }) user!: UserResponse;

  private readonly authService = inject(AuthService);
  private readonly passwordResetService = inject(PasswordResetService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // Security score constants
  private readonly EMAIL_VERIFIED_SCORE = 40;
  private readonly ACCOUNT_ACTIVE_SCORE = 20;
  private readonly PASSWORD_CHANGED_SCORE = 20;
  private readonly HAS_ROLES_SCORE = 20;

  // Security level thresholds
  private readonly HIGH_SECURITY_THRESHOLD = 80;
  private readonly MEDIUM_SECURITY_THRESHOLD = 50;

  protected tokenExpiration = signal<string | null>(null);
  protected passwordResetSending = false;
  protected passwordResetFeedback: { type: 'success' | 'error'; message: string } | null = null;

  /**
   * Initializes component and loads token expiration data
   */
  ngOnInit(): void {
    this.loadTokenExpiration();
  }

  /**
   * Loads token expiration information
   */
  private loadTokenExpiration(): void {
    const expiration = this.authService.getTokenExpiration();
    this.tokenExpiration.set(expiration);
  }

  /**
   * Requests sending the password reset email.
   */
  protected changePassword(): void {
    if (this.passwordResetSending) return;

    const email = this.user.email;
    if (!email) {
      this.passwordResetFeedback = {
        type: 'error',
        message: 'No se puede iniciar el cambio porque el usuario no tiene un correo configurado.'
      };
      return;
    }

    this.passwordResetSending = true;
    this.passwordResetFeedback = null;

    this.passwordResetService.forgotPassword(email).subscribe({
      next: () => {
        this.passwordResetSending = false;
        this.passwordResetFeedback = {
          type: 'success',
          message: 'Enviamos un correo con el enlace temporal para restablecer tu contraseña.'
        };
      },
      error: (err: unknown) => {
        this.passwordResetSending = false;
        const detail = this.errorHandler.getErrorMessage(
          err,
          'No se pudo iniciar el restablecimiento. Intenta nuevamente.'
        );
        this.passwordResetFeedback = { type: 'error', message: detail };
      }
    });
  }

  /**
   * Logs out the current user
   */
  protected logout(): void {
    this.authService.logout();
  }

  /**
   * Gets security score based on account settings
   * @returns Security score (0-100)
   */
  protected getSecurityScore(): number {
    let score = 0;

    // Email verified
    if (this.user.isEmailVerified) {
      score += this.EMAIL_VERIFIED_SCORE;
    }

    // Account active
    if (this.user.isActive) {
      score += this.ACCOUNT_ACTIVE_SCORE;
    }

    // Not first login (means password was changed)
    if (!this.user.isFirstLogin) {
      score += this.PASSWORD_CHANGED_SCORE;
    }

    // Has roles assigned
    if (this.user.roles && this.user.roles.length > 0) {
      score += this.HAS_ROLES_SCORE;
    }

    return score;
  }

  /**
   * Gets security level based on score
   */
  protected getSecurityLevel(): { label: string; class: string } {
    const score = this.getSecurityScore();

    if (score >= this.HIGH_SECURITY_THRESHOLD) {
      return { label: 'Alta', class: 'level-high' };
    } else if (score >= this.MEDIUM_SECURITY_THRESHOLD) {
      return { label: 'Media', class: 'level-medium' };
    } else {
      return { label: 'Baja', class: 'level-low' };
    }
  }
}
