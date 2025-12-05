import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { BranchOption } from 'src/app/feature-groups/care-management/models/branches';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';

import {
  MENU_SECTIONS,
  USER_SETTINGS_MESSAGES
} from '../../constants/user-settings.constants';
import { UserResponse } from '../../models/login-model';
import { UserPreferences } from '../../models/user-preferences.model';
import { UserDataPdfService } from '../../services/user-data-pdf.service';
import { UserPreferencesService } from '../../services/user-preferences.service';

/**
 * UserSettingsComponent
 * Manages user preferences and application settings.
 * Stores preferences in localStorage for persistence.
 *
 * Follows Single Responsibility Principle - only handles user settings management.
 */
@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    GenericButtonComponent
  ],
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly preferencesService = inject(UserPreferencesService);
  private readonly authService = inject(AuthService);
  private readonly branchService = inject(BranchService);
  private readonly pdfService = inject(UserDataPdfService);

  protected settingsForm!: FormGroup;
  protected currentUser = signal<UserResponse | null>(null);
  protected isSaving = signal<boolean>(false);
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected branches = signal<BranchOption[]>([]);

  // Active section tracking
  protected activeSection = signal<string>('preferences');

  // Menu sections - imported from constants
  protected readonly menuSections = MENU_SECTIONS;

  /**
   * Initializes component, loads user data, branches, and sets up form
   */
  ngOnInit(): void {
    this.loadUser();
    this.loadBranches();
    this.initializeForm();
  }

  /**
   * Loads current user from AuthService or mock data for presentation
   */
  private loadUser(): void {
    const user = this.authService.getUser();
    this.currentUser.set(user);
  }

  /**
   * Loads available branches for default branch selection
   */
  private loadBranches(): void {
    this.branchService.getBranchOptions().subscribe({
      next: (branches) => {
        this.branches.set(branches);
      },
      error: () => {
        this.branches.set([]);
      }
    });
  }

  /**
   * Initializes the settings form with current preferences
   */
  private initializeForm(): void {
    const preferences = this.preferencesService.getPreferences();

    this.settingsForm = this.fb.group({
      // Application Preferences
      tablePageSize: [preferences.tablePageSize, Validators.required],
      defaultBranchId: [preferences.defaultBranchId],

      // Notifications
      notificationsBrowser: [preferences.notifications.browser],
      notificationsEmail: [preferences.notifications.email],
      notificationsSystem: [preferences.notifications.system]
    });
  }

  /**
   * Changes the active section
   */
  protected changeSection(sectionId: string): void {
    this.activeSection.set(sectionId);
  }

  /**
   * Saves preferences changes
   */
  protected savePreferences(): void {
    if (this.settingsForm.invalid) {
      this.errorMessage.set(USER_SETTINGS_MESSAGES.ERROR.COMPLETE_FIELDS);
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();

    const formValues = this.settingsForm.value;

    const updatedPreferences: Partial<UserPreferences> = {
      tablePageSize: formValues.tablePageSize,
      defaultBranchId: formValues.defaultBranchId,
      notifications: {
        browser: formValues.notificationsBrowser,
        email: formValues.notificationsEmail,
        system: formValues.notificationsSystem
      }
    };

    this.preferencesService.updatePreferences(updatedPreferences);
    this.successMessage.set(USER_SETTINGS_MESSAGES.SUCCESS.PREFERENCES_SAVED);
    this.isSaving.set(false);
  }

  /**
   * Resets preferences to default values
   */
  protected resetToDefaults(): void {
    if (confirm(USER_SETTINGS_MESSAGES.CONFIRM.RESET_PREFERENCES)) {
      this.preferencesService.resetToDefaults();
      this.initializeForm();
      this.successMessage.set(USER_SETTINGS_MESSAGES.SUCCESS.PREFERENCES_RESET);
    }
  }

  /**
   * Clears all messages
   */
  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Downloads user data as a PDF file
   * Delegates PDF generation to UserDataPdfService
   */
  protected downloadUserData(): void {
    const user = this.currentUser();
    if (!user) {
      this.errorMessage.set(USER_SETTINGS_MESSAGES.ERROR.USER_NOT_FOUND);
      return;
    }

    try {
      this.pdfService.generateUserDataPdf(user);
      this.successMessage.set(USER_SETTINGS_MESSAGES.SUCCESS.PDF_DOWNLOADED);
    } catch {
      this.errorMessage.set(USER_SETTINGS_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }
}
