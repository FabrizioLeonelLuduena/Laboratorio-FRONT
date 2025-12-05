/** DTO for creating a label */
export interface LabelCreateDTO {
  protocolId: number;
}

/** DTO for patient name information */
export interface PatientNameDTO {
  firstName: string;
  lastName: string;
}

/** DTO for label with analysis information */
export interface LabelWithAnalysisInfoDTO {
  label: LabelResponseDTO;
  labelConfigurationName: string;
  analysisName: string;
  subStatus: LabelSubStatus;
}

/** DTO for label reprint request */
export interface LabelReprintRequestDTO {
  labels: {
    label_id: number;
    quantity: number;
  }[];
  reason: string;
  printer_id: number;
}

/** DTO for updating an existing label */
export interface LabelUpdateDTO {
  protocolId?: number;
  sectionId?: string;
  status?: LabelStatus;
  subStatus?: LabelSubStatus;
  collectedAt?: Date;
  checkoutAt?: Date;
  checkoutIn?: Date;
  typeId?: number;
  analysisId?: number;
  isActive?: boolean;
}

/** DTO for the complete information about a label */
export interface LabelDTO {
  id: number;
  protocolId: number;
  sectionId: string;
  status: LabelStatus;
  subStatus: LabelSubStatus;
  collectedAt: Date | null;
  checkoutAt: Date | null;
  checkoutIn: Date | null;
  typeId: number;
  analysisId: number;
  version: number;
  isActive: boolean;
  isDiscarded: boolean;
}

/**
 * Represents a request to update the status of multiple labels
 * @property labelIds - Array of label IDs to be updated
 * @property newStatus - The new status to set for the specified labels
 * @property reason - Optional reason for the status change (required for CANCELED/REJECTED status)
 */
export interface LabelStatusUpdateRequestDTO {
  labelIds: number[];
  newStatus: LabelStatus;
  reason?: string;
}

/**
 * Request DTO for canceling labels
 * @property labelIds - Array of label IDs to cancel
 * @property reason - Reason for cancellation (required, 10-500 characters)
 */
export interface LabelCancelRequestDTO {
  labelIds: number[];
  reason: string;
}

/**
 * Response DTO for label cancellation operation
 * @property canceledLabelIds - List of successfully canceled label IDs
 */
export interface CancelLabelsResponseDTO {
  canceledLabelIds: number[];
}

/**
 * Request DTO for rejecting labels
 * @property labelIds - Array of label IDs to reject
 * @property reason - Reason for rejection (required, 10-500 characters)
 */
export interface LabelRejectRequestDTO {
  labelIds: number[];
  reason: string;
}

/**
 * Response DTO for label rejection operation
 * @property rejectedLabelIds - List of successfully rejected label IDs
 */
export interface RejectLabelsResponseDTO {
  rejectedLabelIds: number[];
}

/**
 * Request DTO for discarding labels
 * @property labelIds - Array of label IDs to discard
 */
export interface DiscardLabelsRequestDTO {
  labelIds: number[];
}

/**
 * Response DTO for label discard operation
 * @property discardedLabelIds - List of successfully discarded label IDs
 */
export interface DiscardLabelsResponseDTO {
  discardedLabelIds: number[];
}

/**
 * Request DTO for sending a label to a destination branch
 * @property labelId - The label ID to send
 * @property destinationBranchId - The destination branch ID
 * @property reason - Reason for sending to branch
 * @property notes - Optional additional notes
 */
export interface SendToBranchRequestDTO {
  labelId: number;
  destinationBranchId: number;
  reason: string;
  notes: string;
}

/** Possible statuses of a label in the workflow */
export enum LabelStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_PREPARATION = 'IN_PREPARATION',
  DERIVED = 'DERIVED',
  LOST = 'LOST',
  DELIVERED = 'DELIVERED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED'
}

/** Label sub-statuses */
export enum LabelSubStatus {
  CREATED = 'CREATED',
  PRINTED = 'PRINTED',
  REPRINTED = 'REPRINTED'
}

/**
 * Response from getting labels by protocol or barcode
 */
export interface LabelResponse {
  protocolNumber: string;
  labels: LabelDTO[];
}

/**
 * Represents a label in the reception table with additional display fields
 */
export interface ReceptionLabel extends LabelDTO {
  protocolNumber?: string;
  receivedAt?: Date;
  patientFullName?: string;
  originBranch?: string;
  sampleTypeName?: string;
  areaName?: string;
}

/**
 * Represents a cart item containing labels for check-in.
 * Groups labels by protocol and tracks selected labels for batch operations.
 */
export interface CartItem {
  protocol: string;
  labels: LabelDTO[];
  selectedIds: number[];
  requiredCount: number; // Cantidad de labels requeridos según sampleCount
  isComplete: boolean;
  currentStatus: LabelStatus;
}

/** Simplified DTO for analysis information */
export interface AnalysisSampleDTO {
  id: number;
  shortCode: string;
  name: string;
}

/**
 * Extended DTO for labels with additional information for transport tracking.
 * Extends LabelDTO with previous action and user details.
 * Used specifically for samples in transit (IN_TRANSIT status).
 */
export interface LabelExtendedDTO extends LabelDTO {
  /** Protocol number as string for display */
  protocolNumber?: string;
  /** Full name of the patient */
  patientFullName?: string;
  /** Name of the destination area */
  areaName?: string;
  /** Description of the previous action performed */
  previousAction?: string;
  /** Name of the user who performed the previous action */
  previousUser?: string;
  /** Date of the action/event */
  date?: Date;
}

/**
 * Represents a section related to an area
 */
export interface SectionResponseDTO {
  id: number;
  name: string;
  isActive: boolean;
  areaId: number;
}

/**
 * Represents a list of areas
 */
export interface AreaResponseDTO {
  areaDTOList: AreaDTO[];
}

/**
 * Represents an area inside a sucursal or laboratory
 */
export interface AreaDTO {
  id: number;
  name: string;
  type: string;
  branchId: number;
}


/*
  * Generic interface for paged responses from the backend
 */
/**
 *
 */
export interface Sort {
  unsorted: boolean;
  sorted: boolean;
  empty: boolean;
}

/*
  * Generic interface for paged responses from the backend
 */
/**
 *
 */
export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  offset: number;
  unpaged: boolean;
  paged: boolean;
}

/*
  * Generic interface for paged responses from the backend
 */
/**
 *
 */
export interface PagedResponse {
  content: LabelResponseDTO[];
  pageable: Pageable;
  totalPages: number;
  last: boolean;
  totalElements: number;
  first: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: Sort;
  empty: boolean;
}
/**
 * Interface used to load the tables of sample status
 * Matches backend LabelDTO structure from findByStatus endpoint
 */
export interface LabelResponseDTO {
  id: number;
  name?: string;
  protocolId: number;
  sectionId: number;
  status: LabelStatus;
  subStatus: LabelSubStatus;
  cancellationReason?: string;
  rejectionReason?: string;
  reason?: string;
  typeId: number;
  analysisId: number;
  isActive: boolean;
  urgent: boolean; // Backend sends 'urgent' not 'isUrgent'
  atHome: boolean;
  discarded: boolean; // Backend sends 'discarded' not 'isDiscarded'
  derived: boolean; // Backend sends 'derived' not 'isDerived'
  destinationBranchId?: number;
  lastUpdatedDatetime: string; // Format: dd-MM-yyyy HH:mm:ss from backend
  createdDateTime: string; // Format: dd-MM-yyyy HH:mm:ss from backend
  section: SectionResponseDTO;
  area: AreaDTO;
  patientName: string; // Enriched from Protocol + Patient microservices
  sectionName?: string;
  areaName?: string;
  analysisName?: string;
  branchName?: string;
  sampleType?: string;
  originBranchId?: number;
}
