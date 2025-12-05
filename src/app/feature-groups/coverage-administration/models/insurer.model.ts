import { Plan, PlanCompleteResponseDTO } from './plan.model';
import { SpecificDataDTO } from './specific-data-model';

/**
 * Insurer response.
 */
export interface InsurerResponseDTO {
  /** Unique identifier of the insurer. */
  id: number;
  /** Insurer code. */
  code: string;
  /** Insurer name. */
  name: string;
  /** Insurer acronym. */
  acronym: string;
  /** Insurer type. */
  insurerType: string;
  /** Insurer type name. */
  insurerTypeName: string;
  /** Insurer description. */
  description: string;
  /** Authorization URL. */
  autorizationUrl: string;
  /** Indicates if the insurer is active. */
  active: boolean;
}

/**
 * Request for insurer creation
 */
export interface InsurerCreateRequestDTO {
  /** Insurer code (required, max 20 characters). */
  code: string;
  /** Insurer name (required, 3-100 characters). */
  name: string;
  /** Insurer acronym (required). */
  acronym: string;
  /** Insurer type (required). */
  insurerType: string;
  /** Insurer description (optional, max 255 characters). */
  description?: string;
  /** Authorization URL (optional, max 255 characters). */
  autorizationUrl?: string;
  /** Specific data for insurer type (optional). */
  specificData: SpecificDataDTO | null;
}


/**
 * Data Transfer Object for updating an existing insurer entry.
 * Contains all required fields for insurer update.
 */
export interface InsurerUpdateRequestDTO {
  /** Unique identifier of the insurer to update (required). */
  id: number;
  /** Insurer code (required, max 20 characters). */
  code: string;
  /** Insurer name (required, 3-100 characters). */
  name: string;
  /** Insurer acronym (required). */
  acronym: string;
  /** Insurer type (required). */
  insurerType: string;
  /** Insurer description (optional, max 255 characters). */
  description?: string;
  /** Authorization URL (optional, max 255 characters). */
  autorizationUrl?: string;
  /** Specific data for insurer type (optional). */
  specificData?:  SpecificDataDTO | null;
}

/**
 * Insurer complete response.
 */
export interface InsurerCompleteResponseDTO {
  /** Unique identifier of the insurer. */
  id: number;
  /** Insurer code. */
  code: string;
  /** Insurer name. */
  name: string;
  /** Insurer acronym. */
  acronym: string;
  /** Insurer type. */
  insurerType: string;
  /** Insurer type name. */
  insurerTypeName: string;
  /** Insurer description. */
  description: string;
  /** Authorization URL. */
  autorizationUrl: string;
  /** Indicates if the insurer is active. */
  active: boolean;
  /** Specific data for insurer type. */
  specificData?: SpecificDataDTO | null;
  /** List of plans for the insurer. */
  plans?: PlanCompleteResponseDTO[];
}

/**
 * Request for insurer soft deletion
 */
export interface InsurerDeleteRequestDTO {
  /** Unique identifier of the insurer to delete (required). */
  id: number;
}

/**
 * Insurer/funder with its available plans.
 */
export interface Insurer {
  /** Unique insurer identifier. */
  id: number;
  /** Insurer code. */
  code: string;
  /** Insurer name. */
  name: string;
  /** Acronym. */
  acronym: string;
  /** Insurer type code (e.g. SELF_PAY, PREPAID). */
  insurer_type: string;
  /** Insurer type name (e.g.: Prepaga, Obra social). */
  insurer_type_name: string;
  /** List of associated plans. */
  plans: Plan[];
}
