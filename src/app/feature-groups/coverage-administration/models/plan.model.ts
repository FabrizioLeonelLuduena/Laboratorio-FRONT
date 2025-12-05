import { AgreementResponseDTO } from './agreement.model';


/**
 * Plan response DTO.
 */
export interface PlanResponseDTO {
  /** Unique identifier of the plan. */
  id: number;
  /** Unique identifier of the insurer. */
  insurerId: number;
  /** Name of the insurer. */
  insurerName: string;
  /** Plan code. */
  code: string;
  /** Plan acronym. */
  acronym: string;
  /** Plan name. */
  name: string;
  /** Plan description. */
  description: string;
  /** Indicates if the plan is active. */
  isActive: boolean;
  /** IVA percentage for the plan. */
  iva: number;
}

/**
 * Plan Complete ResponseDTO.
 */
export interface PlanCompleteResponseDTO {
  /** Unique identifier of the plan. */
  id: number;
  /** Unique identifier of the insurer. */
  insurerId: number;
  /** Name of the insurer. */
  insurerName: string;
  /** Plan code. */
  code: string;
  /** Plan acronym. */
  acronym: string;
  /** Plan name. */
  name: string;
  /** Plan description. */
  description: string;
  /** Indicates if the plan is active. */
  isActive: boolean;
  /** List of active agreements for the plan. */
  actualAgreements: AgreementResponseDTO[];
  /** IVA percentage for the plan. */
  iva: number;
}

/**
 * Request for insurer plan creation
 */
export interface PlanCreateRequestDTO {
  /** Unique identifier of the insurer. */
  insurerId: number;
  /** Plan code (required, max 20 characters). */
  code: string;
  /** Plan acronym (required, max 10 characters). */
  acronym: string;
  /** Plan name (required, 3-100 characters). */
  name: string;
  /** Plan description (optional, max 255 characters). */
  description?: string;
}

/**
 * Request for insurer plan update
 */
export interface PlanUpdateRequestDTO {
  /** Unique identifier of the plan to update (required). */
  id: number;
  /** Plan code (required, max 20 characters). */
  code: string;
  /** Plan acronym (required, max 10 characters). */
  acronym: string;
  /** Plan name (required, 3-100 characters). */
  name: string;
  /** Plan description (optional, max 255 characters). */
  description?: string;
  /** IVA percentage for the plan. */
  iva: number;
}

/**
 * Request for insurer plan deletion
 */
export interface PlanDeleteRequestDTO {
  /** Unique identifier of the plan to delete. */
  id: number;
}

/**
 * Coverage plan for an insurer.
 */
export interface Plan {
  /** Unique plan identifier. */
  id: number;
  /** Insurer ID owning the plan. */
  insurer_id: number;
  /** Plan code. */
  code: string;
  /** Optional plan acronym. */
  acronym?: string;
  /** Plan name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Insurer code (for special validations). */
  insurer_code?: string;
  /** Insurer name (for UI display). */
  insurer_name?: string;
}
