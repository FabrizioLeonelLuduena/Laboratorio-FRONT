import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AuthService } from 'src/app/core/authentication/auth.service';
import { SecurityCenterComponent } from 'src/app/feature-groups/user-management/pages/user-profile/sections/security-center/security-center.component';

import { UserResponse } from '../../models/login-model';

import { AccountDetailsComponent } from './sections/account-details/account-details.component';
import { AccountInfoComponent } from './sections/account-info/account-info.component';
import { WorkInfoComponent } from './sections/work-info/work-info.component';

/**
 * UserProfileComponent
 * Main profile page component that displays user information in organized sections.
 * Follows Open/Closed Principle - new sections can be added without modifying this component.
 *
 * Sections:
 * - Account Info: Read-only basic information
 * - Account Details: Editable personal information
 * - Work Info: Lab-related information (roles, branch)
 * - Security Center: Password and security settings
 */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    AccountInfoComponent,
    AccountDetailsComponent,
    WorkInfoComponent,
    SecurityCenterComponent
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  // Current user data signal
  protected currentUser = signal<UserResponse | null>(null);

  // Active section tracking
  protected activeSection = signal<string>('account-info');

  // Menu sections for navigation
  protected menuSections = [
    {
      id: 'account-info',
      label: 'Información de la cuenta',
      icon: 'pi pi-user'
    },
    {
      id: 'account-details',
      label: 'Detalles de la cuenta',
      icon: 'pi pi-id-card'
    },
    {
      id: 'work-info',
      label: 'Información laboral',
      icon: 'pi pi-briefcase'
    },
    {
      id: 'security-center',
      label: 'Centro de seguridad',
      icon: 'pi pi-shield'
    }
  ];

  /**
   * Initializes component and loads user data
   */
  ngOnInit(): void {
    this.loadUserData();
  }

  /**
   * Loads current user data from AuthService
   */
  private loadUserData(): void {
    const user = this.authService.getUser();
    this.currentUser.set(user ?? null);
  }

  /**
   * Changes the active section
   * @param sectionId - ID of the section to display
   */
  protected changeSection(sectionId: string): void {
    this.activeSection.set(sectionId);
  }

  /**
   * Refreshes user data from localStorage
   * Called after user updates their information
   */
  protected refreshUserData(): void {
    this.loadUserData();
  }
}
