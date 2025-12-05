import { PatientResponse } from '../../patients/models/PatientModel';

import { Analysis } from './analysis.models';

/**
 * Response DTO for attention (laboratory service)
 * Note: Field names match backend snake_case JSON properties
 */
export interface AttentionResponse {
  attentionId: number;
  attentionState: string;
  attentionNumber: string;
  branchId: number;
  admissionDate: string;
  patientId: number;
  insurancePlanId: number;
  doctorId: number;
  indications: string;
  authorizationNumber: number;
  isUrgent: boolean;
  analysisIds: number[];
  paymentId: number;
  labelCount: number;
  protocolId: number;
  employeeId: number;
  attentionBox: number;
  observations: string;
  prescriptionFileUrl: string;
  patient?: PatientResponse;
}

/**
 * Request DTO to create a pre-filled attention from an appointment
 */
export interface CreatePreFilledAttentionRequest {
  appointmentId: number;
}

/**
 * Request DTO to create a new blank attention
 */
export interface CreateNewAttentionRequest {
  patientId: number;
  attentionNumber: string;
  branchId: number;
}

/**
 * Request DTO to assign general data (patient, doctor, insurance, indications) to an attention
 */
export interface AssignGeneralDataToAttentionRequest {
  patientId: number;
  doctorId: number;
  coverageId: number;
  authorizationNumber?: number;
  indications?: string;
}

/**
 * Request DTO to add analysis list to an attention
 */
export interface AddAnalysisListRequest {
  analyses: AnalysisAuthorization[];
  isUrgent: boolean;
  authorizationNumber: number;
}

/**
 * Request DTO to add analysis authorization
 */
export interface AnalysisAuthorization{
  analysisId: number;
  isAuthorized: boolean;
}

/**
 * Request DTO to add payment to an attention
 */
export interface AddPaymentToAttentionRequest {
  paymentId: number;
}

/**
 * Request DTO to assign extractor to an attention
 */
export interface AssignExtractorToAttentionRequest {
  extractorId: number;
  attentionBox: number;
}

/**
 * Request DTO to add observations to an attention
 */
export interface AddExtractorNoteToAttentionRequest {
  observations: string;
}

/**
 * Request DTO to cancel an attention
 * Interceptor converts camelCase to snake_case for backend
 */
export interface CancelAttentionRequestDto {
  cancellationReason: string;
}

/**
 * DTO containing analysis authorization information
 */
export interface AnalysisAuthorizationDto {
  analysisId: number;
  isAuthorized: boolean;
}

/**
 * DTO containing payment information needed for payment process
 */
export interface PaymentInfoNeededDto {
  insurancePlanId: number;
  attentionId: number;
  analysisAuthorizations: AnalysisAuthorizationDto[];
}

/** DTO containing all info needed for ticket printing*/
export interface TicketDto {
  branchName: string;
  branchContacts: string[];
  date: string;
  patientId: string;
  patientFullName: string;
  patientDni: string;
  patientBirthDate: string;
  email: string;
  analyses: Analysis[];
  healthPlan: string;
  totalPrice: string;
}
