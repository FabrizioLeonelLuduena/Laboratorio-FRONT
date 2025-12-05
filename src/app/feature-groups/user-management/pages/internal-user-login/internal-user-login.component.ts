import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { LoginFormComponent } from 'src/app/shared/components/login-form/login-form.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

import { LoginRequest } from '../../models/login-model';

/**
 * Component for internal user login page.
 * Handles user authentication and displays loading state.
 */
@Component({
  selector: 'app-internal-user-login',
  standalone: true,
  imports: [
    CommonModule,
    LoginFormComponent,
    SpinnerComponent,
    GenericAlertComponent
  ],
  templateUrl: './internal-user-login.component.html',
  styleUrl: './internal-user-login.component.css'
})
export class InternalUserLoginComponent {
  isErrorFading = false;
  private authService = inject(AuthService);

  isLoading = false;
  errorMsg: string | null = null;

  /**
   * Handles login form submission.
   * Initiates authentication process and manages loading state and error messages.
   * @param credentials - The login credentials submitted from the form.
   */
  onLogin(credentials: LoginRequest) {
    this.errorMsg = null;
    this.isLoading = true;
    const start = Date.now();

    // Only pass username and password to the login service
    const loginPayload: LoginRequest = {
      username: credentials.username,
      password: credentials.password
    };

    if (credentials.username) { // Convierte a mayusculas el username
      credentials.username = credentials.username.toUpperCase();
    }

    this.authService.login(loginPayload).subscribe({
      next: (_response) => {
        /**
         * Ensure the spinner is visible for at least 1.5 seconds.
         * Later remove this delay for a more responsive UI.
         */
        const elapsed = Date.now() - start;
        const minWait = 1500;
        const wait = Math.max(0, minWait - elapsed);
        setTimeout(() => {
          this.isLoading = false;
          // Redirection (first login or dashboard) is handled by AuthService.handlePostLoginRedirect
        }, wait);
      },      
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Error de autenticación';
        this.isErrorFading = false;
        setTimeout(() => {
          this.isErrorFading = true;
          setTimeout(() => {
            this.errorMsg = null;
            this.isErrorFading = false;
          }, 400); // duración de la animación
        }, 5000);
      }
    });
  }

  /**
   * Quick access login for portfolio demonstration.
   * Loads a predefined token for the Stock Management area.
   */
  quickLoginStock() {
    this.isLoading = true;
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJNQU5BR0VSX1NUT0NLIiwiT1BFUkFET1JfQ09NUFJBUyJdLCJpZCI6MSwic3ViIjoiTUFOQUdFUl9TVE9DS19PUEVSQURPUl9DT01QUkFTIiwiaWF0IjoxNzYyNDc3MzYwLCJleHAiOjE4MjU1NDkzNjB9.8DTRagaybgxvhG39GovRdUX6-ScKWVXXQsBqaewALv4';
    
    // Store token in localStorage
    localStorage.setItem('auth_token', token);
    
    // Create mock user data based on token
    const mockUser = {
      id: 1,
      username: 'MANAGER_STOCK_OPERADOR_COMPRAS',
      isActive: true,
      isFirstLogin: false
    };
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    
    // Simulate loading delay for UX
    setTimeout(() => {
      this.isLoading = false;
      this.authService.redirectToDashboard();
    }, 1000);
  }

}
