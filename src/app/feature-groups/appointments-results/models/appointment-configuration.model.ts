/**
 * Data Transfer Object for creating a new appointment configuration.
 * Represents the template for appointment availability rules.
 */
export interface CreateAppointmentConfiguration {
  /** ID of the branch where appointments will be available */
  branchId: number;
  /** Start time in HH:mm:ss format (e.g., "09:00:00") */
  startTime: string;
  /** End time in HH:mm:ss format (e.g., "17:30:00") */
  endTime: string;
  /** Total number of appointments available in this time slot */
  appointmentsCount: number;
  /** Duration of each appointment slot in minutes */
  slotDurationMinutes: number;
  /** Whether this is a recurring rule or a specific date range rule */
  isRecurring: boolean;
  /** Days of the week (1=Monday to 7=Sunday). Required if isRecurring is true */
  recurringDaysOfWeek: number[];
  /** Start date for the validity period in YYYY-MM-DD format */
  validFromDate: string;
  /** End date for the validity period in YYYY-MM-DD format */
  validToDate: string;
  /** ID of the user creating this configuration */
  createdUser: number;
}

/**
 * Data Transfer Object for updating an existing appointment configuration.
 * Includes all fields from creation plus ID and version for optimistic locking.
 */
export interface UpdateAppointmentConfiguration {
  /** ID of the configuration to modify */
  id: number;
  /** ID of the branch where appointments will be available */
  branchId: number;
  /** Start time in HH:mm:ss format */
  startTime: string;
  /** End time in HH:mm:ss format */
  endTime: string;
  /** Total number of appointments available in this time slot */
  appointmentsCount: number;
  /** Duration of each appointment slot in minutes */
  slotDurationMinutes: number;
  /** Whether this is a recurring rule or a specific date range rule */
  isRecurring: boolean;
  /** Days of the week (1=Monday to 7=Sunday). Required if isRecurring is true */
  recurringDaysOfWeek: number[];
  /** Start date for the validity period in YYYY-MM-DD format */
  validFromDate: string;
  /** End date for the validity period in YYYY-MM-DD format */
  validToDate: string;
  /** ID of the user modifying this configuration */
  lastUpdatedUser: number;
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Complete appointment configuration entity for application use.
 * Represents the normalized frontend model with consistent naming.
 * This is the main interface used throughout the application.
 */
export interface AppointmentConfiguration {
  /** Unique identifier for the configuration */
  id: number;
  /** ID of the branch where appointments will be available */
  branchId: number;
  /** Start time in HH:mm:ss format */
  startTime: string;
  /** End time in HH:mm:ss format */
  endTime: string;
  /** Number of appointments available in this time slot */
  appointmentsCount: number;
  /** Duration of each appointment slot in minutes */
  slotDurationMinutes: number;
  /** Whether this is a recurring rule or a specific date range rule */
  isRecurring: boolean;
  /** Days of the week (1=Monday to 7=Sunday). Required if isRecurring is true */
  recurringDaysOfWeek: number[];
  /** Start date for the validity period in YYYY-MM-DD format */
  validFromDate: string;
  /** End date for the validity period in YYYY-MM-DD format */
  validToDate: string;
  /** Version number for optimistic locking */
  version: number;
  /** Timestamp when the configuration was created in ISO format */
  createdDatetime: string;
  /** Timestamp when the configuration was last updated in ISO format */
  lastUpdatedDatetime: string;
  /** ID of the user who created this configuration */
  createdUser: number;
  /** ID of the user who last updated this configuration */
  lastUpdatedUser: number;
  /** Whether the configuration is active (can be used for new appointments) */
  active: boolean;
  /** Whether the configuration is inactive (inverse of active, for backward compatibility) */
  inactive: boolean;
}

/**
 * Represents the days of the week for recurring appointments.
 * Used for better type safety and readability.
 */
export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7
}

/**
 * Helper type for day of week labels in Spanish.
 */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo'
};
