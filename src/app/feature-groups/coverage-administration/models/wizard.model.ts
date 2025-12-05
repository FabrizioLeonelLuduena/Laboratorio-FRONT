import { InsurerCreateRequestDTO } from './insurer.model';


/**
 * Wizard Create interface
 */
export interface WizardCreateDTO{
  /** Insurer information for the wizard (required). */
  insurer:InsurerCreateRequestDTO;
  /** List of plans for the wizard. */
  plans:PlanWithAgreement[];
  /** List of contacts for the wizard. */
  contacts:WizardContactCreateDTO[];
}

/**
 * Wizard Create Plan interface
 */
export interface WizardCreatePlanDTO{
  /** Unique identifier of the insurer. */
  insurerId: number;
  /** Plan information & Agreement (required). */
  plan:PlanWithAgreement;
}

/**
 * Request to create insurer plan with agreement
 */
export interface PlanWithAgreement {
  /** Plan information (required). */
  plan: PlanWizardCreateRequestDTO;
  /** Coverage information (required). */
  agreement: AgreementWizardCreateRequestDTO;
}

/**
 * Request to create the plan of an insurer through the wizard
 */
export interface PlanWizardCreateRequestDTO {
  code: string; // Max 20 characters
  acronym: string; // Max 10 characters
  name: string; // 3 - 100 characters
  iva: number; // >= 0
  description?: string; // Max 255 characters
}

/**
 * Request to create coverage for an insurer plan in the wizard
 */
export interface AgreementWizardCreateRequestDTO {
  versionNbu: number; // NBU version
  requiresCopayment: boolean; // Whether copayment is required
  coveragePercentage: number; // 0 - 100
  ubValue: number; // > 0
  validFromDate: string; // ISO date (e.g., "2025-09-28T00:00:00")
}

/**
 * Request to create contacts for an insurer
 */
export interface WizardContactCreateDTO {
  contactType: string;
  contact: string;
}
