/**
 * Queue status enumeration
 */
export enum QueueStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED'
}

/**
 * Queue entry creation request DTO
 */
export interface QueueRequestDto {
  nationalId: string;
  branchId: number;
  hasAppointment: boolean;
}

/**
 * Represents a patient's entry in the queue, as returned by the API.
 */
export interface QueueResponseDto {
  publicCode: string;
  nationalId: string;
  branchId?: number;
  hasAppointment: boolean;
  status: QueueStatusEnum;
  createdAt: string;
  attendedAt?: string;
  boxNumber: number;
}

/**
 * Queue status update DTO
 */
export interface QueueUpdateDto {
  publicCode: string;
  nationalId: string;
  status: QueueStatusEnum;
  branchId: number;
  boxNumber: number;
}

/**
 * Paginated response interface from backend
 */
export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

/**
 * Appointment response DTO
 */
export interface AppointmentResponseDto {
  id: number;
  patientId: number;
  branchId: number;
  appointmentDatetime: string;
  appointmentStatus: string;
  prescriptionFileUrl?: string;
  comments?: string;
  determinationIds?: number[];
}

/**
 * Complete queue patient data DTO
 * Maps to backend QueueResponseAllDataDTO
 */
export interface QueuePatientFullDataDto {
  queueResponseDto?: QueueResponseDto;
  patientData?: any;
  appointmentResponseDto?: AppointmentResponseDto;
  analysisDTO?: any;
}

/**
 * Queue completed entry DTO
 * Represents a completed queue entry with patient and attention details
 */
export interface QueueCompletedDto {
  publicCode: string;
  boxNumber: number;
}
