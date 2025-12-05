import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { UserResponse } from 'src/app/feature-groups/user-management/models/login-model';

/**
 * AccountInfoComponent
 * Displays read-only account information for the user.
 * Shows creation date, last update, and account status.
 */
@Component({
  selector: 'app-account-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-info.component.html',
  styleUrls: ['./account-info.component.css']
})
export class AccountInfoComponent {
  @Input({ required: true }) user!: UserResponse;

  /**
   * Formats a date string to a readable format
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  protected formatDate(dateString: Date | string): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
