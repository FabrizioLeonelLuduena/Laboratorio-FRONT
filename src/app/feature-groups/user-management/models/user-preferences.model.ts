/**
 * User preferences model
 * Stores user-specific UI and application preferences in localStorage
 */

/**
 * Notification preferences for different channels
 */
export interface NotificationPreferences {
  /** Enable browser push notifications */
  browser: boolean;
  /** Enable email notifications */
  email: boolean;
  /** Enable system notifications (for lab operations) */
  system: boolean;
}

/**
 * Complete user preferences object
 */
export interface UserPreferences {
  /** Notification settings */
  notifications: NotificationPreferences;

  /** Default number of rows per page in tables */
  tablePageSize: number;

  /** Default branch ID for the user */
  defaultBranchId?: number;

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    browser: true,
    email: true,
    system: true
  },
  tablePageSize: 10,
  lastUpdated: new Date().toISOString()
};
