import { AgreementResponseDTO } from './agreement.model';
import { InsurerResponseDTO } from './insurer.model';
import { PlanResponseDTO } from './plan.model';

/** Special rule sent for special settlements (snake_case to match backend). */
export interface SettlementSpecialRulesDTO {
  /** Type of rule (FIXED_AMOUNT, GREATER_THAN, LESS_THAN, EQUALS, BETWEEN). */
  type: string;
  /** Description for easier identification. */
  description?: string;
  /** Related analysis ID, if applicable. */
  analysisId?: number;
  /** Minimum quantity threshold (for GREATER_THAN or BETWEEN). */
  minQuantity?: number;
  /** Maximum quantity threshold (for LESS_THAN or BETWEEN). */
  maxQuantity?: number;
  /** Exact quantity (for EQUALS). */
  equalQuantity?: number;
  /** Fixed amount (for FIXED_AMOUNT or any conditional amount). */
  amount?: number;
}
/**
 * Model representing data ready to display in the settlements table.
 * (Fields already transformed for the view: formatted dates, readable enums, etc.)
 */
export interface SettlementTableItem {
  id: number;
  insurerId:number;
  insurerName: string;
  insurerAcronym: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  providedServicesCount: number;
  /** Informed amount (taken from the total in the complete response). */
  informedAmount: number;
  /** Informed date (if available). */
  informedDate?: string;
  /** Observations (if available). */
  observations?: string;
  /** Liquidated plans with subtotal and quantity of provided services. */
  liquidatedPlans: LiquidatedPlanSummary[];
}

/** Summary per plan for the expandable detail. */
export interface LiquidatedPlanSummary {
  name: string;
  subtotal: number;
  providedServicesCount: number;
}

/**
 * DTO for representing a settlement in API responses.
 * Maps directly to the backend JSON response (snake_case).
 */
export interface SettlementResponseDTO {
  /** Settlement identifier. */
  id: number;
  /** Current settlement status. */
  status: string;
  /** Settlement type. */
  type: string;
  /** Insurer id. */
  insurerId: number;
  /** Insurer name. */
  insurerName: string;
  /** Insurer acronym. */
  insurerAcronym: string;
  /** Period start date. */
  periodStart: string;
  /** Period end date. */
  periodEnd: string;
  /** Total number of provided services included. */
  providedServicesCount: number;
  /** Date when the settlement was informed. */
  informedDate: string;
  /** Amount that was informed. */
  informedAmount?: number;
  /** The observations that were informed. */
  observations: string;
}

/**
 * Enum representing possible settlement statuses.
 */
export enum SettlementStatus {
  PENDING = 'Pendiente',
  CANCEL = 'Anulada',
  INFORMED = 'Informada',
  BILLED = 'Facturada'
}

/**
 * Enum representing settlement types.
 */
export enum SettlementType {
  SIMPLE = 'Común',
  ESPECIAL = 'Especial'
}

/** Rule applied to a plan with computed result. */
export interface SettlementPlanRuleResponseDTO {
  ruleId: number;
  ruleType: string;
  subtotal: number; // BigDecimal
  providedServicesCount: number; // Integer
}

/**
 * DTO representing settlement coverage details.
 */
export interface SettlementAgreementDTO {
  /** Agreement information. */
  agreement: AgreementResponseDTO;
  /** Subtotal of the agreement. */
  subtotal: number; // BigDecimal
  /** Count of the Provided Services. */
  providedServicesCount: number; // Integer
  /** Cache key. */
  key: string;
  /** Total pages. */
  pages: number; // Integer total pages
}

/**
 * DTO representing settlement plan details.
 */
export interface SettlementPlanDTO {
  /** Plan associated with the settlement. */
  plan?: PlanResponseDTO;
  /** List of provided services associated with the settlement. */
  settlementAgreements: SettlementAgreementDTO[];
  planRules: SettlementPlanRuleResponseDTO[];
}
/**
 * Complete response DTO for a settlement.
 */
export interface SettlementCompleteResponseDTO {
  /** Unique identifier of the settlement when persisted. */
  id: number;
  /** Current settlement status. */
  status: string;
  /** Settlement type/strategy used to compute the settlement. */
  type: string;
  /** Insurer associated with the settlement. */
  insurer: InsurerResponseDTO;
  /** Start of the settlement period (inclusive). */
  periodStart: string | number[]; // LocalDate may arrive as string or [yyyy,mm,dd]
  /** End of the settlement period (inclusive). */
  periodEnd: string | number[];   // LocalDate may arrive as string or [yyyy,mm,dd]
  /** List of plans containing grouped provided services and subtotals. */
  plansProvidedServices: SettlementPlanDTO[];
  /**  Informed Date */
  informedDate: string;
  /** Informed Amount */
  informedAmount: number;
  /** Total settlement amount (sum of plans/subtotals). */
  total: number; // BigDecimal
  /** Total number of provided services included in the settlement. */
  totalProvidedServices: number; // Integer
  /** Redis cache key holding this full settlement, when cached. */
  settlementKey?: string;
  /** Observations. */
  observations:string;
}

/**
 * DTO for creating  a settlement request.
 * Matches the backend SettlementRequestDTO.
 */
export interface SettlementCreateRequestDTO {
  /** Unique identifier of the insurer. */
  insurerId: number;
  /** Period start date. */
  periodStart: string;
  /** Period end date. */
  periodEnd: string;
  /** List of excluded provided service IDs. */
  excludedProvidedServicesIds?: number[];
  /** List of excluded agreement IDs. */
  excludedAgreementsIds?: number[];
  /** Settlement redis key. */
  settlementKey?: string;
  /** Settlement type. */
  settlementType: string;
  /** Rules for special settlement (optional). */
  specialRules?: SettlementSpecialRulesDTO[];
}

/**
 * Represents a simplified row in the settlements table (aggregated per agreement).
 * Includes redis base key and page count to enable navigation to the paginated view.
 */
export interface ProvidedServiceTableItemDTO {
  /** Plan name or code (e.g., osde210, osde500) */
  plan: string;

  /** NBU version associated with the plan (e.g., 2012_2016, 2016_2024) */
  versionNbu: string;

  /** Valid from date (ISO string: 'yyyy-MM-dd') */
  validFrom: string;

  /** Valid to date (maybe null or '-') */
  validTo: string | null;

  /** Number of protocols (provided services) */
  protocols: number;

  /** Fee amount */
  fee: number;

  /** Corresponding subtotal */
  subtotal: number;

  /** Redis base key for fetching provided services pages (backend field 'key') */
  baseKey?: string;

  /** Total number of pages available for this agreement (backend field 'pages') */
  pageCount?: number;
}

/**
 * Settlement summary information.
 */
export interface SettlementResumeDTO {
  /** Settlement number */
  settlementNumber: number;

  /** Total number of provided services */
  providedServicesCount: number;

  /** Settlement total amount */
  total: number;

  /** Current settlement status (e.g. PENDING, INFORMED, BILLED, CANCEL) */
  status?: string;
}

/**
 * DTO for requesting a settlement preview.
 */
export interface SettlementPreviewRequestDTO {
  /** Insurer identifier. */
  insurerId: number;
  /** Period start date. */
  periodStart: string;
  /** Period end date. */
  periodEnd: string;
  /** Optional settlement type to choose strategy. Defaults to SIMPLE when null. */
  type?: string;
  /** Special rules for the settlement (optional). */
  specialRules?: SettlementSpecialRulesDTO[];
}

/**
 * Event emitted when provided services are excluded or re-included in a settlement detail view.
 */
export interface ProvidedServicesExclusionEvent {
  /** IDs of excluded provided services */
  excludedIds: number[];
  /** Count of currently excluded services */
  excludedCount: number;
  /** Total remaining services (not excluded) */
  totalServices: number;
  /** Updated subtotal after exclusions */
  subtotal: number;
}
