/**
 * Request for agreement creation for insurer plan
 */
export interface AgreementCreateRequestDTO {
  /** Identifier of the insurer plan. */
  insurerPlanId: number;
  /** NBU version identifier (required). */
  versionNbu: number;
  /** Indicates if copayment is required (required). */
  requiresCopayment: boolean;
  /** Coverage percentage (required, 0-100). */
  coveragePercentage: number;
  /** UB value (required, >0). */
  ubValue: number;
  /** Start date of coverage validity (required, present or future). */
  validFromDate: string;
}

/**
 * Request for agreement deletion for insurer plan
 */
export interface AgreementDeleteRequestDTO {
  /** Unique identifier of the coverage to delete (required). */
  id: number;
}

/**
 * Request for agreement update for insurer plan
 */
export interface AgreementUpdateRequestDTO {
  /** Unique identifier of the coverage to update (required). */
  id: number;
  /** Identifier of the insurer plan (required). */
  insurerPlanId: number;
  /** NBU version identifier (required). */
  versionNbu: number;
  /** Indicates if copayment is required (required). */
  requiresCopayment: boolean;
  /** Coverage percentage (required, 0-100). */
  coveragePercentage: number;
  /** UB value (required, >0). */
  ubValue: number;
  /** Start date of coverage validity (required, present or future). */
  validFromDate: string;
}

/**
 * DTO representing agreement response details.
 */
export interface AgreementResponseDTO {
  /** Unique identifier of the coverage. */
  id: number;
  /** Identifier of the insurer plan. */
  insurerPlanId: number;
  /** Name of the insurer plan. */
  insurerPlanName?: string;
  /** NBU version identifier. */
  versionNbu: number;
  /** Indicates if copayment is required. */
  requiresCopayment: boolean;
  /** Coverage percentage. */
  coveragePercentage: number;
  /** UB value. */
  ubValue: number;
  /** Start date of coverage validity. */
  validFromDate: string;
  /** End date of coverage validity. */
  validToDate?: string;
}
