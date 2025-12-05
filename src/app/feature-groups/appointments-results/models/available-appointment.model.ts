/**
 * Represents an available appointment slot on a specific date and time.
 * This is the response from the availability endpoint that shows 
 * actual available time slots based on configurations and existing bookings.
 */
export interface AvailableAppointment {
  /** ID of the configuration that generated this available slot */
  configurationId: number;
  /** Date in dd-MM-yyyy format */
  date: string;
  /** Start time in HH:mm:ss format */
  startTime: string;
  /** End time in HH:mm:ss format */
  endTime: string;
  /** Total number of appointments configured for this slot */
  totalAppointments: number;
  /** Number of appointments already scheduled */
  scheduledAppointments: number;
  /** Number of appointments still available */
  availableAppointments: number;
  /** Whether this slot is completely booked */
  isFullyBooked: boolean;
  /** Unique opaque identifier for this slot - CRITICAL for booking appointments */
  slotId: string;
}

/**
 * Query parameters for fetching available appointments.
 * Supports three modes: specific date, date range, or default window.
 */
export interface AvailabilityQuery {
  /** ID of the branch (required) */
  branchId: number;
  /** Specific date in YYYY-MM-DD format (optional) */
  date?: string;
  /** Start date for range query in YYYY-MM-DD format (optional) */
  fromDate?: string;
  /** End date for range query in YYYY-MM-DD format (optional) */
  toDate?: string;
}

/**
 * Represents the availability mode for querying appointments.
 */
export enum AvailabilityMode {
  /** Query for a specific date */
  SPECIFIC_DATE = 'specific_date',
  /** Query for a date range */
  DATE_RANGE = 'date_range',
  /** Use default window (next 15 days starting from today + 2) */
  DEFAULT_WINDOW = 'default_window'
}
