/**
 * User Settings Component Constants
 *
 * Centralizes all user-facing messages and labels.
 * All text in English as per repository style guide.
 */
export const USER_SETTINGS_MESSAGES = {
  // Success messages
  SUCCESS: {
    PREFERENCES_SAVED: 'Preferences saved successfully.',
    PREFERENCES_RESET: 'Preferences reset to default values.',
    PDF_DOWNLOADED: 'PDF file downloaded successfully.'
  },

  // Error messages
  ERROR: {
    COMPLETE_FIELDS: 'Please complete all fields correctly.',
    USER_NOT_FOUND: 'Could not retrieve user information.',
    INVALID_FORM: 'Please complete all required fields correctly.'
  },

  // Confirmation messages
  CONFIRM: {
    RESET_PREFERENCES:
      'Are you sure you want to reset all preferences to default values?'
  }
} as const;

/**
 * Menu sections configuration
 */
export const MENU_SECTIONS = [
  {
    id: 'preferences',
    label: 'Preferences',
    icon: 'pi pi-cog'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'pi pi-bell'
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'pi pi-shield'
  }
] as const;
