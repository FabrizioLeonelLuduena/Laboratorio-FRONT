import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from '../generic-form/generic-form.component';

/**
 * Login form component.
 *
 * Provides a reactive form for the user to enter their username and password.
 * Allows toggling the password visibility and emits an event when the form
 * is successfully submitted.
 *
 * @example
 * <app-login-form (submitLogin)="handleLogin($event)"></app-login-form>
 */
@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    IconFieldModule,
    // Generic components used in the template
    GenericFormComponent,
    GenericButtonComponent
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css'
})
export class LoginFormComponent {

  private fb = inject(FormBuilder);

  @Output() submitLogin = new EventEmitter<any>();

  // Optional inputs to make this component reusable while keeping default appearance
  @Input() title: string = '¡Bienvenido!';
  @Input() subtitle: string = 'Ingresa tus credenciales para acceder';
  @Input() logoSrc: string = 'LCC-logo-horizontal.png';
  @Input() submitLabel: string = 'Iniciar sesión';
  @Input() forgotLink: string = '/password-recover';
  @Input() showFooter: boolean = true;
  /** Controls whether the forgot password link is shown */
  @Input() showForgotLink: boolean = true;

  /** Button customization */
  /** Optional custom style object for the login button */
  @Input() buttonStyle: Record<string, any> | null = null;
  @Input() buttonType: 'save' | 'accept' | 'cancel' | 'back' | 'search' | 'create' | 'custom' | 'alternative' = 'create';
  /** If buttonType is 'custom', pass CSS variable name without var(), e.g. '--brand-accent' */
  @Input() buttonColor?: string | null = null;
  /** If true, button will be full width like inputs (default true) */
  @Input() buttonFullWidth = true;
  /** Optional icon class to pass to the generic button (e.g. 'pi pi-sign-in') */
  @Input() buttonIcon?: string | null = null;
  /** Optional background image URL to show in the auth card */
  @Input() backgroundImage?: string | null = null;
  /** Optional background color to apply to the auth card (e.g. '#fff' or 'rgba(0,0,0,0.1)') */
  @Input() backgroundColor?: string | null = null;

  /** Optional: custom fields metadata (uses GenericForm) */
  @Input() fields: GenericFormField[] | null = null;
  /** Optional: initial values for the custom fields */
  @Input() initialValue: Record<string, any> | null = null;

  /** Field names mapping when using custom fields */
  @Input() usernameKey = 'username';
  @Input() passwordKey = 'password';
  /** Forwarded prop: whether GenericForm shows its Cancel button (default true) */
  @Input() genericShowCancel = true;
  /** Forwarded prop: whether GenericForm shows its internal Submit button (default true). If false, login-form will render its own submit button and trigger the GenericForm submit. */
  @Input() genericShowSubmit = true;

  /** Controls whether the inner form is shown. Useful for project alternative content
   *   (e.g. a success message) within the same card.
   */
  @Input() showInnerForm = true;
  /** Optional icon to show in the header when the inner form is hidden (e.g. success state) */
  @Input() headerIcon?: string | null = null;


  /** Custom FormGroup-level validators (e.g., password match). */
  @Input() formValidators: ValidatorFn | ValidatorFn[] | null = null;

  showPassword = false;

  /**
   * Returns the computed ngStyle object for the background area.
   * Moved to TypeScript to avoid braces inside the template which can
   * interfere with the @if preprocessor parsing.
   */
  get backgroundStyle(): Record<string, string> {
    if (this.backgroundImage) {
      return {
        'background-image': `url(${this.backgroundImage})`,
        'background-size': 'cover',
        'background-position': 'center'
      };
    }
    return { 'background-color': this.backgroundColor ?? '' };
  }

  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  /**
   * Handles form submission.
   *
   * If the form is valid, emits the `submitLogin` event with the form values.
   * If the form is invalid, marks all fields as touched to display validation errors.
   */
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.submitLogin.emit(this.loginForm.getRawValue());
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  /** Handler when GenericForm emits submitForm */
  onGenericSubmit(payload: Record<string, any>): void {
    this.submitLogin.emit(payload);
  }

  /** Getter for easy access to the `username` field in the template */
  get username() {
    return this.loginForm.get('username');
  }
  /** Getter for easy access to the `password` field in the template */
  get password() {
    return this.loginForm.get('password');
  }

}
