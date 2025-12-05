import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { UserResponse } from 'src/app/feature-groups/user-management/models/login-model';
import { UpdateUserRequestDTO } from 'src/app/feature-groups/user-management/models/UpdateUserRequestDTO';
import { UserService } from 'src/app/feature-groups/user-management/services/user.service';

/**
 * AccountDetailsComponent
 * Allows users to edit their personal information.
 * Updates both backend and localStorage on successful save.
 *
 * Follows Single Responsibility Principle - only handles user detail editing.
 */
@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit {
  @Input({ required: true }) user!: UserResponse;
  @Output() userUpdated = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  protected editForm!: FormGroup;
  protected isEditing = signal<boolean>(false);
  protected isSaving = signal<boolean>(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  /**
   * Initializes component and sets up the edit form
   */
  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initializes the edit form with current user data
   */
  private initializeForm(): void {
    this.editForm = this.fb.group({
      firstName: [this.user.firstName, [Validators.required, Validators.minLength(2)]],
      lastName: [this.user.lastName, [Validators.required, Validators.minLength(2)]],
      username: [this.user.username, [Validators.required, Validators.minLength(3)]],
      email: [this.user.email, [Validators.required, Validators.email]],
      document: [this.user.document, [Validators.required]]
    });

    // Disable form by default
    this.editForm.disable();
  }

  /**
   * Enables editing mode
   */
  protected enableEditing(): void {
    this.isEditing.set(true);
    this.editForm.enable();
    this.clearMessages();
  }

  /**
   * Cancels editing and resets form
   */
  protected cancelEditing(): void {
    this.isEditing.set(false);
    this.editForm.patchValue({
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      username: this.user.username,
      email: this.user.email,
      document: this.user.document
    });
    this.editForm.disable();
    this.clearMessages();
  }

  /**
   * Saves the updated user information
   */
  protected saveChanges(): void {
    if (this.editForm.invalid) {
      this.errorMessage.set('Por favor, completa todos los campos correctamente.');
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();

    const updateData: UpdateUserRequestDTO = {
      ...this.editForm.value,
      roleId: this.user.roles.map(role => role.id),
      branchId: this.user.branchId
    };

    this.userService.updateUser(this.user.id, updateData).subscribe({
      next: (updatedUser) => {
        // Update localStorage with new user data
        const currentUser = this.authService.getUser();
        if (currentUser) {
          const updatedUserData: UserResponse = {
            ...currentUser,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            username: updatedUser.username,
            email: updatedUser.email,
            document: updatedUser.document,
            lastUpdatedDatetime: new Date(updatedUser.lastUpdatedDatetime)
          };
          this.authService.updateUserInStorage(updatedUserData);
        }

        this.successMessage.set('Información actualizada correctamente.');
        this.isEditing.set(false);
        this.editForm.disable();
        this.isSaving.set(false);

        // Emit event to refresh parent component
        this.userUpdated.emit();
      },
      error: (error) => {
        this.errorMessage.set(
          error?.message || 'Error al actualizar la información. Intenta nuevamente.'
        );
        this.isSaving.set(false);
      }
    });
  }

  /**
   * Clears all messages
   */
  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  /**
   * Gets form control errors for display
   */
  protected getFieldError(fieldName: string): string | null {
    const control = this.editForm.get(fieldName);
    if (control && control.invalid && control.touched) {
      if (control.errors?.['required']) {
        return 'Este campo es obligatorio';
      }
      if (control.errors?.['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors?.['email']) {
        return 'Email inválido';
      }
    }
    return null;
  }
}
