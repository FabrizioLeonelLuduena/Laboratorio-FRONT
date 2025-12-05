import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { NewPasswordRequestDTO, ResetRequestDTO, TokenDTO } from '../models/password-reset.models';


/**
 * Service to manage user password recovery and reset.
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/v1/auth`;

  /**
   * Requests sending a password recovery email to the user.
   * @param email - User's email requesting password recovery
   * * @returns Observable with the server response
   */
  forgotPassword(email: string): Observable<string> {
    const request: ResetRequestDTO = { data: email };
    return this.http.post(
      `${this.apiUrl}/password/forgot`,
      request,
      { responseType: 'text' }
    ) as Observable<string>;
  }

  /**
   * Requests sending a password recovery email for portal users.
   * @param email - User's email requesting password recovery
   * @returns Observable with the server response
   */
  forgotPasswordPortal(email: string): Observable<string> {
    const request: ResetRequestDTO = { data: email };
    return this.http.post(
      `${this.apiUrl}/portal/password/forgot`,
      request,
      { responseType: 'text' }
    ) as Observable<string>;
  }

  /**
   * Validates the password reset token.
   * @param token - Password reset token to validate
   * @returns Observable with the server response
   */
  validateToken(token: string): Observable<string> {
    const request: TokenDTO = { token };
    return this.http.post(
      `${this.apiUrl}/password/validate-reset`,
      request,
      { responseType: 'text' }
    );
  }

  /**
   * Resets the user's password using the provided token and new password.
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Observable with the server response
   */
  resetPassword(token: string, newPassword: string): Observable<string> {
    const request: NewPasswordRequestDTO = { token, newPassword };
    return this.http.post(
      `${this.apiUrl}/password/reset`,
      request,
      { responseType: 'text' }
    );
  }

  /**
   * Sets the password for first login using the first login token and new password.
   * @param token - First login token
   * @param newPassword - New password
   * @returns Observable with the server response
   */
  setPasswordFirstLogin(newPassword: string, token: string): Observable<string> {
    const request = { token, newPassword };
    return this.http.post(
      `${this.apiUrl}/password/set-password-first-login`,
      request,
      { responseType: 'text' }
    ) as Observable<string>;
  }
}
