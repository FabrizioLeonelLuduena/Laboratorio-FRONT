import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TokenDTO } from '../models/password-reset.models';

/**
 * Service to manage user email verification
 */
@Injectable({
  providedIn: 'root'
})
export class EmailVerificationService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/auth`;

  /**
   * Verify the user's email using the verification token
   * @param token - Verification token received by email
   * @returns Observable that is populated if the verification is successful
   */
  verifyEmail(token: string): Observable<string> {
    const request: TokenDTO = { token };
    return this.http.post(
      `${this.apiUrl}/email/verify-token`,
      request,
      { responseType: 'text' }
    );
  }
}
