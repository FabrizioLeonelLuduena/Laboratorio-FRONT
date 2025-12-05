import { Injectable, signal } from '@angular/core';

import { DEFAULT_USER_PREFERENCES, UserPreferences } from '../models/user-preferences.model';

/**
 * UserPreferencesService
 * Service to manage user preferences stored in localStorage.
 * Provides reactive signals for preference changes.
 *
 * @implements Single Responsibility Principle - Only handles user preferences
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly PREFERENCES_KEY = 'user_preferences';

  // Reactive signal for preferences changes
  private preferencesSignal = signal<UserPreferences>(this.loadPreferences());

  /** Read-only signal exposing current preferences */
  public readonly preferences$ = this.preferencesSignal.asReadonly();

  /**
   * Loads preferences from localStorage or returns defaults
   * @returns UserPreferences object
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_USER_PREFERENCES, ...parsed };
      }
    } catch {
      // Failed to parse preferences, will return defaults
    }
    return { ...DEFAULT_USER_PREFERENCES };
  }

  /**
   * Saves preferences to localStorage and updates signal
   * @param preferences - Complete or partial preferences object
   */
  private savePreferences(preferences: UserPreferences): void {
    try {
      preferences.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
      this.preferencesSignal.set(preferences);
    } catch {
      // Failed to save preferences to localStorage
    }
  }

  /**
   * Gets current preferences
   * @returns Current UserPreferences object
   */
  getPreferences(): UserPreferences {
    return this.preferencesSignal();
  }

  /**
   * Updates preferences with partial data
   * @param partialPreferences - Partial preferences to update
   */
  updatePreferences(partialPreferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...partialPreferences };
    this.savePreferences(updated);
  }

  /**
   * Updates notification preferences
   * @param notifications - Notification preferences object
   */
  setNotificationPreferences(notifications: Partial<UserPreferences['notifications']>): void {
    const current = this.getPreferences();
    this.updatePreferences({
      notifications: { ...current.notifications, ...notifications }
    });
  }

  /**
   * Gets notification preferences
   * @returns Notification preferences object
   */
  getNotificationPreferences(): UserPreferences['notifications'] {
    return this.getPreferences().notifications;
  }

  /**
   * Gets a specific notification preference
   * @param key - The notification preference key (browser, email, system)
   * @returns Boolean value of the preference
   */
  getNotificationPreference(key: keyof UserPreferences['notifications']): boolean {
    return this.getPreferences().notifications[key];
  }

  /**
   * Updates table page size preference
   * @param size - Number of rows per page
   */
  setTablePageSize(size: number): void {
    this.updatePreferences({ tablePageSize: size });
  }

  /**
   * Gets table page size preference
   * @returns Number of rows per page
   */
  getTablePageSize(): number {
    return this.getPreferences().tablePageSize;
  }

  /**
   * Updates default branch ID
   * @param branchId - Branch ID to set as default
   */
  setDefaultBranch(branchId: number): void {
    this.updatePreferences({ defaultBranchId: branchId });
  }

  /**
   * Gets default branch ID
   * @returns Default branch ID or undefined
   */
  getDefaultBranch(): number | undefined {
    return this.getPreferences().defaultBranchId;
  }

  /**
   * Resets preferences to default values
   */
  resetToDefaults(): void {
    this.savePreferences({ ...DEFAULT_USER_PREFERENCES });
  }

  /**
   * Clears all preferences from localStorage
   */
  clearPreferences(): void {
    try {
      localStorage.removeItem(this.PREFERENCES_KEY);
      this.preferencesSignal.set({ ...DEFAULT_USER_PREFERENCES });
    } catch {
      // Failed to clear preferences from localStorage
    }
  }
}
