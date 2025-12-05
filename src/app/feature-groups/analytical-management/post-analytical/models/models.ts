/**
 * Enums matching backend
 */
export enum StudyStatus {
  PENDING = 'PENDING',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  READY_FOR_SIGNATURE = 'READY_FOR_SIGNATURE',
  CLOSED = 'CLOSED'
}

export enum ResultStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED'
}

export enum ValidationStatus {
  PENDING = 'PENDING',
  VALID = 'VALIDATED',
  INVALID = 'INVALID',
  REJECTED = 'REJECTED'
}

/**
 * Patient Information DTO
 */
export interface PatientInfoDto {
  externalId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email?: string;
  phone?: string;
}

/**
 * Study List Item DTO - for table view
 */
export interface StudyListItemDto {
  id: number;
  protocolCode: string;
  createdDatetime: string;
  patient: PatientInfoDto;
  currentStatus: StudyStatus;
  lastStatusDatetime: string;
  expectedResultsCount: number;
  signedResultsCount: number;
  version: number;
}

/**
 * Biochemist Info DTO
 */
export interface BiochemistInfoDto {
  externalId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  license: string;
}

/**
 * Determination DTO
 */
export interface DeterminationDto {
  id: number;
  determinationId: number;
  name: string;
  value: number;
  displayValue: string;
  unit: string;
  referenceRange: string;
  isValid: boolean;
  validationLabel: string;
  autoValidationStatus: ValidationStatus;
  manualValidationStatus: ValidationStatus;
  manualValidator?: BiochemistInfoDto;
  manualValidationDatetime?: string;
  validationComment?: string;
  historicalValues?: DeterminationHistoricalDto[];
}

/**
 * Determination Historical DTO
 */
export interface DeterminationHistoricalDto {
  value: string;
}

/**
 * Result Detail DTO
 */
export interface ResultDetailDto {
  id: number;
  analyticResultId: string;
  resultTypeName: string;
  currentStatus: ResultStatus;
  automaticValidationStatus: ValidationStatus;
  manualValidationStatus: ValidationStatus;
  determinations: DeterminationDto[];
}

/**
 * Study Detail DTO - for detail view
 */
export interface StudyDetailDto {
  id: number;
  protocolCode: string;
  patient: PatientInfoDto;
  createdDatetime: string;
  currentStatus: StudyStatus;
  lastStatusDatetime: string;
  results: ResultDetailDto[];
  integrityHash: string;
  version: number;
}

/**
 * Paged Response DTO
 */
export interface PagedResponseDto<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Study Filter Request DTO
 */
export interface StudyFilterRequestDto {
  status?: StudyStatus;
  dateFrom?: string;
  dateTo?: string;
  patientName?: string;
  patientDni?: string;
  page: number;
  size: number;
  sortBy: string;
  sortDirection: string;
}

/**
 * Local Filters interface for UI
 */
export interface Filtros {
  buscarTexto: string;
  estadoFirma: string;
  fechaDesde: Date | string | null;
  fechaHasta: Date | string | null;
}

/**
 * Signature Request DTO
 */
export interface SignatureRequestDto {
  comments?: string;
}

/**
 * Partial Signature Response DTO
 */
export interface PartialSignatureResponseDto {
  resultId: number;
  analyticResultId: string;
  studyId: number;
  protocolCode: string;
  signatureId: number;
  signatureHash: string;
  signatureDatetime: string;
  professionalExternalId: string;
  totalResults: number;
  signedResults: number;
  readyForTotalSignature: boolean;
  studyStatus: string;
  message: string;
}

/**
 * Total Signature Response DTO
 */
export interface TotalSignatureResponseDto {
  studyId: number;
  protocolCode: string;
  signatureId: number;
  signatureHash: string;
  integrityHash: string;
  signatureDatetime: string;
  professionalExternalId: string;
  totalResults: number;
  signedResults: number;
  studyStatus: string;
  finalReportPath: string;
  reportHash: string;
  message: string;
}

/**
 * Bulk Signature Response DTO
 */
export interface BulkSignatureResponseDto {
  studyId: number;
  protocolCode: string;
  signedResultIds: number[];
  signedCount: number;
  totalResults: number;
  previouslySignedResults: number;
  studyStatus: string;
  readyForTotalSignature: boolean;
  totalSignaturePerformed: boolean;
  studySignatureId?: number;
  studySignatureHash?: string;
  studyIntegrityHash?: string;
  operationDatetime: string;
  professionalExternalId: string;
  message: string;
}

/**
 * Determination Edit DTO - for editing/adding determinations
 */
export interface DeterminationEditDto {
  id?: number; // Entity ID for updates (from determination.id)
  determinationId: number; // Determination type ID (always sent)
  value: string;
  observations?: string;
  isNew: boolean; // Flag to indicate if it's a new determination
}

/**
 * Determinations Edit Request DTO
 */
export interface DeterminationsEditRequestDto {
  determinations: DeterminationEditDto[];
}

/**
 * Determinations Edit Response DTO
 */
export interface DeterminationsEditResponseDto {
  added: number;
  updated: number;
  total: number;
  errors: string[];
}

