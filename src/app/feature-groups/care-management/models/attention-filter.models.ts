/**
 * Filter parameters for querying attentions.
 * All fields are optional.
 */
export interface AttentionFilterParams {
  /** List of states to exclude from results */
  excludeStates?: string[];
  
  /** Filter attentions from this date (format: YYYY-MM-DD) */
  dateFrom?: string;
  
  /** Filter attentions until this date (format: YYYY-MM-DD) */
  dateTo?: string;
  
  /** Whether to include patient data in the response */
  includePatient?: boolean;
  
  /** Optional: Filter by branch ID */
  branchId?: number;
  
  /** Optional: Filter by urgent flag */
  isUrgent?: boolean;
}

