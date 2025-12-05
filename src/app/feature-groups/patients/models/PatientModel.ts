/** =========================================================
 *  Patient Models (Create / Read / Update)
 *  ---------------------------------------------------------
 *  - Use *Create for POST (creation) → without id or metadata.
 *  - Use the “full” models for GET/PUT (read/edit).
 *  - Guardian is an OBJECT, not an array.
 *  - birthDate (Request/Update): yyyy-MM-dd
 *    birthDate (Response): dd-MM-yyyy (according to backend)
 *  - streetNumber as a string (avoids friction).
 * ========================================================= */

/** Enums / alias */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
/**
 *
 */
export type ContactType = 'EMAIL' | 'PHONE' | 'WHATSAPP';
/**
 *
 */
export type PatientStatus = 'MIN' | 'COMPLETE' | 'VERIFIED' | 'DEACTIVATED';

/** ---------------------- Guardian ---------------------- */
export interface GuardianRequestDto {
  document: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  bond: string;
  isOwner: boolean;
  status: string;
  verify?: boolean;
}

/** For editing only (PUT) — mirrors backend structure */
export interface GuardianUpdateDto {
  userId?: number | null;
  document: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  bond: string;
  verify: boolean;
}


/** ---------------------- Address (Read/Update) ---------------------- */
/** Full Address model returned by the backend or used for editing. */
export interface Address {
  id: number;
  street: string;
  streetNumber: string;
  apartment: string;
  neighborhood: string;
  city: string;
  province: string;
  zipCode: string;
  isPrimary: boolean;
}

/** Address for CREATE (POST) → without id or metadata */
export type AddressCreate = Pick<
  Address,
  | 'street'
  | 'streetNumber'
  | 'apartment'
  | 'neighborhood'
  | 'city'
  | 'province'
  | 'zipCode'
  | 'isPrimary'
>;

/** ---------------------- Contact (Read/Update) ---------------------- */
export interface Contact {
  id?: number;
  contactValue: string;
  contactType: ContactType;
  isPrimary: boolean;
}

/** Contact for post */
export type ContactCreate = Omit<Contact, 'id'>;

/** ---------------------- Coverage (Read/Update) ---------------------- */
/** Full Coverage model with metadata (returned by backend) */
export interface Coverage {
  id: number;
  insurerId: number;
  insurerAcronym: string;
  insurerName: string;
  isInsurerActive: boolean;

  planId: number;
  planCode: string;
  planAcronym: string;
  planName: string;
  isPlanActive: boolean;

  insurerTypeId: number;
  insurerTypeName: string;

  memberNumber: string;
  isPrimary: boolean;
}

/** ---------------------- Coverage for CREATE (POST) → only what the backend requires */
export type CoverageCreate = Pick<Coverage, 'planId' | 'memberNumber' | 'isPrimary'>;

/** ---------------------- Payment (Read) ---------------------- */
/**
 * DTO for payment detail summary in patient integration responses.
 * Contains essential information about each analysis included in the payment.
 */
export interface PaymentDetailSummaryDto {
  /** Identifier of the payment detail */
  paymentDetailId: number;

  /** Identifier of the coverage associated with the payment detail, if applicable */
  coverageId: number | null;

  /** Identifier of the analysis associated with the payment detail */
  analysisId: number;

  /** Indicates if the analysis is covered by insurance */
  isCovered: boolean;
}

/**
 * DTO containing summarized payment data for patient integration responses.
 * This is a simplified version with only the essential payment fields.
 */
export interface PaymentSummaryDto {
  /** Processing result status */
  status: string;

  /** Human readable message with additional details */
  message: string;

  /** Processed copayment */
  copayment: number;

  /** IVA amount processed */
  iva: number;

  /** Timestamp when the transaction was recorded (ISO string) */
  paymentDate: string;

  /** Details of the payment */
  details: PaymentDetailSummaryDto[];
}

/** ---------------------- Patient Attention ---------------------- */
/**
 * Represents a patient attention record with associated protocol and payment information.
 */
export interface PatientAtention {
  /** Attention ID associated with the patient */
  attentionId: number;
  /** Doctor identifier associated with the medical order (if any) */
  doctorId?: number | null;

  /** Current state of the attention */
  attentionState: AttentionState;

  /** Most advanced state reached in the workflow */
  mostAdvancedState: AttentionState;

  /** Attention number for identification */
  attentionNumber: string;

  /** Date and time when the attention was registered (ISO string) */
  admissionDate: string;

  /** Insurance plan ID associated with the attention */
  insurancePlanId: number | null;

  /** Payment ID associated with the attention */
  paymentId: number | null;

  /** Protocol ID that stemmed from the attention */
  protocolId: number | null;

  /** Embedded protocol data for this attention (if available) */
  protocol?: ProtocolEmbedded | null;

  /** Embedded payment summary data for this attention (if available) - backend sends as 'payment' */
  payment?: PaymentSummaryDto | null;

  /** Alternative field name for payment data (for compatibility) */
  paymentDto?: PaymentSummaryDto | null;
}

/** Enum-like union for attention states */
export type AttentionState =
  | 'REGISTERING_GENERAL_DATA'
  | 'REGISTERING_ANALYSES'
  | 'ON_COLLECTION_PROCESS'
  | 'ON_BILLING_PROCESS'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_EXTRACTION'
  | 'IN_EXTRACTION'
  | 'FINISHED'
  | 'CANCELED'
  | 'FAILED';

/** ---------------------- Protocols (Read) ---------------------- */
export type ProtocolStatus =
  | 'CREATED'
  | 'READY_TO_SAMPLES_COLLECTION'
  | 'SAMPLES_COLLECTED'
  | 'PRE_ANALYTICAL'
  | 'ANALYTICAL'
  | 'POST_ANALYTICAL'
  | 'DELIVERED'
  | 'CANCELED'
  | string;
/**
 *
 */
export type ProtocolAnalysisStatus = 'PRE_ANALYTICAL' | 'ANALYTICAL' | 'POST_ANALYTICAL' | string;
/**
 *
 */
export type ProtocolAnalysisSubStatus =
  | 'READY_TO_SAMPLE_COLLECTION'
  | 'SAMPLE_PREPARED'
  | 'SAMPLE_CHECKED_IN'
  | 'MANUAL_MEASUREMENT_IN_PROGRESS'
  | 'AUTOMATED_MEASUREMENT_IN_PROGRESS'
  | 'LOADED_RESULTS'
  | 'MEASUREMENT_MANUAL_REVIEW'
  | 'MEASUREMENT_AUTOMATED_REVIEW'
  | 'MEASUREMENT_TECHNICAL_REVIEW'
  | 'RESULTS_VALIDATED'
  | 'RESULTS_DELIVERED'
  | 'CANCELED'
  | string;

/**
 *
 */
export interface ProtocolAnalysis {
  id: number;
  protocol: string;
  name: string;
  code: string;
  status: ProtocolAnalysisStatus;
  created_datetime: string; // ISO
  last_updated_datetime: string; // ISO
  analysis_id: number;
  sub_status: ProtocolAnalysisSubStatus;
}


/** ---------------------- Patient (Read/Update) ---------------------- */
/**
 * “Full” model for read/edit (PUT).
 * - Includes id, status, isActive and arrays with “full” models.
 * - birthDate: yyyy-MM-dd (when used for editing).
 */
export interface Patient {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;              // yyyy-MM-dd
  gender: Gender;
  sexAtBirth: string;
  isVerified?: boolean;
  isActive: boolean;
  hasGuardian?: boolean;
  status: PatientStatus;
  guardians?: GuardianUpdateDto[];  // List of guardians (backend name)
  addresses: Address[];
  contacts: Contact[];
  coverages: Coverage[];
}

/** ---------------------- PatientRequest (Create/POST) ---------------------- */
/**
 * Request for CREATE (POST)
 * - No id, no status, no isActive.
 * - Uses *Create in arrays.
 * - birthDate: yyyy-MM-dd
 */
export interface PatientRequest {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;              // yyyy-MM-dd
  gender: Gender;
  sexAtBirth: string;
  isVerified?: boolean;
  hasGuardian?: boolean;
  guardian?: GuardianRequestDto;  // single object
  contacts: ContactCreate[];
  addresses: AddressCreate[];     // at least one primary, if required by domain
  coverages: CoverageCreate[];
}

/** ---------------------- PatientResponse (Read/GET) ---------------------- */
/**
 * Backend response (read).
 * - birthDate in dd-MM-yyyy format (according to swagger).
 * - Includes status/isActive and “full” arrays.
 */
export interface PatientResponse {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;

  /** dd-MM-yyyy (backend responds this way) */
  birthDate: string;

  gender: Gender;
  sexAtBirth: string;

  status: PatientStatus;
  isActive: boolean;

  hasGuardian?: boolean;
  guardians?: GuardianRequestDto[];  // List of guardians (backend name)

  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
}


/** ---------------------- Embedded Protocol for Attentions ---------------------- */
/** Minimal analysis shape embedded inside protocol for UI */
export interface ProtocolAnalysisEmbedded {
  name: string;
  sub_status: ProtocolAnalysisSubStatus;
}

/** Minimal protocol shape embedded inside an attention */
export interface ProtocolEmbedded {
  /** Protocol identifier (backend: protocol_id) */
  protocolId: number;
  status: ProtocolStatus;
  /** ISO or null depending on backend */
  created_datetime: string | null;
  /** ISO or null depending on backend */
  last_updated_datetime: string | null;
  analyses: ProtocolAnalysisEmbedded[];
}

/** ---------------------- PatientAttentionResponse (Read/GET) ---------------------- */
/**
 * New read DTO that includes attentions with their associated protocol and analyses.
 * Keeps the camelCase convention used in the frontend models.
 */
export interface PatientAttentionResponse {
  id: number;
  dni: string;
  gender: Gender | null;
  status: PatientStatus;

  guardians?: GuardianRequestDto[] | null;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];

  firstName: string;
  lastName: string;
  /** dd-MM-yyyy */
  birthDate: string;
  sexAtBirth: string;
  isActive: boolean;
  hasGuardian?: boolean | null;

  attentions: PatientAtention[];

  /** List of study IDs associated with the patient (from post-analytical service) */
  studyIds?: number[];

  appointmentIds?: number[];
}

/** ---------------------- Minimal projection ---------------------- */
export interface PatientMin {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
}
