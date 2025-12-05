/**
 * Filters for searching appointments
 * @interface AppointmentFilters
 */
export interface AppointmentFilters {
  date?: string;
  branchId?: number;
  status?: string[];
  searchCriteria?: string;
  sort?: string;
  dir?: string;
  page?: number;
  size?: number;
}

/**
 * DTO for paginated daily appointments
 * @interface AppointmentDayPageDto
 */
export interface AppointmentDayPageDto {
  content: Appointment[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
/**
 * Basic appointment model for list display
 */
export interface Appointment {
  appointmentId: number;
  time: string;
  status: string;

  branchId: number;
  branchName: string;

  patientId: number;
  patientName: string;

  determinationIds: number[];
  determinationNames: string[];
}

/**
 * Detailed appointment response from GET /appointments/{id}
 */
export interface AppointmentDetailResponse {
  id: number;
  appointmentDatetime: string;
  branchId: number;
  patientId: number;
  determinationIds: number[];
  confirmationNumber: string | null;
  comments: string | null;
  prescriptionFileUrl: string | null;
  status: string;
  analysis: any[];
}

