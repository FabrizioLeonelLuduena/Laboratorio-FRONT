/**
 * Request model for creating a new appointment.
 * Uses snake_case to match backend API expectations.
 */
export interface CreateAppointmentRequest {
  patient_id: number;
  branch_id: number;
  slot_id: string;
  determination_ids?: number[];
  comments?: string;
}
