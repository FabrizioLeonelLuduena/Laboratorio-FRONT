/**
 * Special rules for settlements
 */
export interface SettlementSpecialRulesDTO {
  type: RuleType;
  description: string;
  analysisId: number;
  minQuantity: number;
  maxQuantity: number;
  equalQuantity: number;
  amount: number;
}

/**
 * Represents an item for plan selection, including its ID and name.
 */
export interface PlanSelectionItem {
  id: number;
  name: string;
}

/**
 * Payload structure for sending plan rules, containing the plan ID and a list of settlement special rules.
 */
export interface PlanRulesPayload {
  planId: number;
  rules: SettlementSpecialRulesDTO[];
}

/**
 * Enum defining the types of rules that can be applied to settlements.
 * These types dictate how quantities or amounts are evaluated.
 */
export enum RuleType {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  BETWEEN = 'BETWEEN'
}

