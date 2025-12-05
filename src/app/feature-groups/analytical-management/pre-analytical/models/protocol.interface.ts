/**
 * Represents a protocol returned by the backend.
 * A protocol groups analyses, samples, patient data, and its current status.
 */
export interface ProtocolResponse {

  /** Unique identifier of the protocol */
  id: number;

  /** Full name of the patient associated with the protocol */
  patientName: string;

  /** Timestamp when the protocol was created */
  createdAt: string | null;

  /** Current protocol status (e.g., CREATED, IN_PROGRESS, COMPLETED) */
  status: string;

  /** Username of the user who created the protocol */
  userCreator: string;

  /** List of analyses included in this protocol */
  analysis: AnalysisTracking[];
}




/**
 * Represents a single analysis inside a protocol.
 * Contains metadata, identifiers, status, and its associated samples.
 */
export interface AnalysisTracking {

  /** Unique identifier of this analysis instance inside the protocol */
  id: number;

  /** Identifier of the analysis type defined in the catalog (NBU analysis id) */
  analysisId: number;

  /** Human-readable name of the analysis */
  name: string;

  /** Name of the analysis family or group it belongs to */
  familyName: string;

  /** Current status of the analysis (e.g., PENDING, IN_PROGRESS, COMPLETED) */
  status: string;

  /** Short numeric code used to identify the analysis */
  shortCode: number;

  /** List of samples associated with this analysis and their statuses */
  samples: SampleWithStatuses[];
}



/**
 * Represents a sample taken for a specific analysis,
 * including its basic metadata and full status history.
 */
export interface SampleWithStatuses {

  /** Unique identifier of the sample */
  sampleId: number;

  /** Type of the sample (e.g., Blood, Urine, Swab) */
  type: string;

  /** Method used to collect the sample (e.g., Venipuncture, Capillary) */
  collectionMethod: string;

  /** Identifier of the label attached to this sample */
  labelId: number;

  /** Chronological list of statuses describing the sample lifecycle */
  statuses: SampleStatusTracking[];
}


/**
 * Represents a single status update in the lifecycle of a sample.
 * Includes timestamp, the user who registered it, and contextual information.
 */
export interface SampleStatusTracking {

  /** Status name (e.g., COLLECTED, IN_PREPARATION, RECEIVED) */
  status: string;

  /** Timestamp when this status change was recorded */
  dateTime: string;

  /** User who recorded this status */
  user: string;

  /** Section or lab area where this status was registered */
  section: string;

  /** Additional notes or reason for this status (optional) */
  reason: string;
}

