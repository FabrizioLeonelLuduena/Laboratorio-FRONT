/**
 * Response from GET /api/v1/worksheets/forms/{templateId}?sectionId={sectionId}
 * This is the main structure returned when generating a dynamic worksheet
 */
export interface WorksheetFormData {
  /**
   * Unique identifier of the generated worksheet (can be null)
   */
  worksheetId: number | null;

  /**
   * Name of the template used for this worksheet
   */
  worksheetName: string;

  /**
   * Unique identifier of the section/area.
   */
  sectionId: number;

  /**
   * Array of analyses included in this worksheet, each representing a separate table
   */
  analyses: AnalysisSection[];
}

/**
 * Each analysis section with its determinations and patients
 * Represents a single "table" in the worksheet UI
 */
export interface AnalysisSection {
  /**
   * Unique identifier of the analysis
   */
  analysisId: number;

  /**
   * Display name of the analysis
   */
  analysisName: string;

  /**
   * Array of determinations (rows in the table)
   */
  determinations: DeterminationInfo[];

  /**
   * Array of patients/samples (columns in the table)
   */
  patients: PatientInfo[];
}

/**
 * Information about a single determination (what is being measured)
 */
export interface DeterminationInfo {
  /**
   * Unique identifier of the determination
   */
  determinationId: number;

  /**
   * Display name of the determination
   */
  determinationName: string;

  /**
   * Unit of measurement (e.g., "g/dL", "mill/mm³")
   */
  unit?: string;

  /**
   * Normal reference range (e.g., "4.5-5.5")
   */
  normalRange?: string;
}

/**
 * Patient/sample information for the worksheet
 */
export interface PatientInfo {
  /**
   * Unique identifier of the sample
   */
  sampleId: number;

  /**
   * Unique identifier of the patient
   */
  patientId: number;

  /**
   * Unique identifier of the protocol for this specific patient
   */
  protocolId: number;

  /**
   * Full name of the patient
   */
  patientName: string;

  /**
   * Protocol number associated with this sample (for display)
   */
  protocolNumber: string;

  /**
   * When the sample was collected (array format from backend)
   */
  collectionDate: number[] | string;

  /**
   * Type of sample (e.g., "SANGRE")
   */
  sampleType?: string;
}

/**
 * Legacy interface - kept for backward compatibility
 */
export interface WorksheetSample {
  sampleId: number;
  protocolNumber: string;
  patientName: string | null;
  areaName: string | null;
  collectionDate: string;
}

/**
 * Form state structure
 * [sampleId][analysisId][determinationId] = value
 */
export interface WorksheetFormState {
  [sampleId: number]: {
    [analysisId: number]: {
      [determinationId: number]: string;
    };
  };
}

/**
 * Payload to POST /api/v1/results
 * Used to save all results in a single batch operation
 */
export interface ResultsPayload {
  /**
   * Array of result entries, one per sample/analysis combination
   */
  entries: ResultEntry[];
}

/**
 * Single entry in the results payload
 * Groups all determinations for one sample + one analysis
 */
export interface ResultEntry {
  /**
   * Unique identifier of the patient for this specific entry
   */
  patientId: number;

  /**
   * Unique identifier of the protocol for this specific entry
   */
  protocolId: number;

  /**
   * ID of the sample being reported
   */
  sampleId: number;

  /**
   * ID of the analysis performed
   */
  analysisId: number;

  /**
   * ID of the section/area where the analysis is performed
   */
  sectionId: number;

  /**
   * Array of individual determination results
   */
  results: DeterminationResult[];
}

/**
 * Individual determination result value
 */
export interface DeterminationResult {
  /**
   * ID of the determination measured
   */
  determinationId: number;

  /**
   * The measured value (as string, can be numeric or text)
   */
  value: string;
}

/**
 * Represents a basic analysis entity with minimal information
 * Response from GET /api/v1/analyses/basic
 */
export interface AnalysisBasicDTO {
  /**
   * Unique identifier of the analysis
   */
  id: number;

  /**
   * Display name of the analysis
   */
  name: string;

  /**
   * Short code of the analysis (e.g., "HEM001")
   */
  code: string;

  /**
   * Short code of the analysis (e.g., "HEM001")
   */
  shortCode: string;

  /**
   * Name used for visual representation
   */
  searchField: string;
}
