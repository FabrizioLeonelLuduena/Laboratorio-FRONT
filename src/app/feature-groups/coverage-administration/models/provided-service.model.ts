/**
 * Provided Service DTO returned by settlement pages endpoint.
 * Mirrors backend ProvidedServiceCompleteResponseDTO (snake_case).
 */
export interface CalculateItemResultDTO {
  planName: string;
  insurerName: string;
  coverageId: number;
  analysisId: number;
  analysisName: string;
  totalAmount: number;
  coveredAmount: number;
  patientAmount: number;
  ubValue: number;
  ubUsed: number;
  ubSource: string;
  nbuVersionId: number;
  note: string;
}

/**
 * Patient associated with the provided service.
 */
export interface PatientDTO {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  coverages: any[];
}

/**
 * Complete provided service within a settlement result.
 * Contains patient, service date, copayment, authorization number,
 * and analysis amounts breakdown.
 */
export interface ProvidedServiceCompleteResponseDTO {
  id: number;

  patient: PatientDTO;

  copaymentAmount?: number;

  configuration: ConfigurationDTO;

  protocol: Protocol;

  serviceDate?: any;

  authorizationNumber?: string | null;

  analysisAmounts?: CalculateItemResultDTO[];
}

/**
 * Protocol.
 */
export interface Protocol  {
  /**
   * Unique identifier for the protocol.
   */
  id:number;
  /**
   * status of the protocol.
   */
  status:string;
}


/** Branch. */
export interface ConfigurationDTO {
  /** Unique identifier of the branch. */
  id: number;

  /** Branch code. */
  code: string;

  /** Branch description. */
  description: string;
}


/**
 * Flattened row used by the generic-table component.
 */
export interface ProvidedServiceRow {
  id: number;
  /** Patient full name */
  patient: string;
  /** Patient DNI */
  dni: string;
  /** Pre-formatted date to display */
  serviceDate: string | '-';
  /** Authorization number or '-' */
  authorizationNumber: string | '-';
  /** Analysis count */
  analisis: number;
  /** Sum of covered amounts (formatted with currency) */
  amountCovered: string;
  /** Copayment amount (formatted with currency) */
  copayment: string;
  /**
   * status of the protocol.
   */
  status:string;
  /** List for expanded row rendering */
  analysisAmounts: CalculateItemResultDTO[];
  /** Marcado temporal para selección UI */
  selected?: boolean;
  /** Marcado cuando se haya excluido definitivamente */
  excluded?: boolean;
  /** Procedencia del servicio */
  procedencia?: string;
}
