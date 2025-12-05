// --- Base DTOs from Backend ---

/**
 * Represents the traffic report data from the backend, including peak hours and attention counts.
 */
export interface TrafficReportDto {
  peak_hours: HourlyTrafficDto[];
  total_attentions: number;
  attentions_by_branch: BranchTrafficDto[];
  attentions_by_day_of_week: DayOfWeekTrafficDto[];
}

/**
 *
 */
export interface PerformanceReportDto {
  average_completion_time_minutes: number;
  average_time_per_stage: StageTimeDto[];
  completion_rate_percentage: number;
  cancellation_rate_percentage: number;
  total_finished: number;
  total_cancelled: number;
  total_attentions: number;
}

/**
 *
 */
export interface OperationalReportDto {
  urgent_vs_non_urgent: UrgencyComparisonDto;
  cancellations_by_state: CancellationByStateDto[];
  extractor_performance: ExtractorPerformanceDto[];
  box_utilization: BoxUtilizationDto[];
  most_requested_analyses: AnalysisFrequencyDto[];
}


// --- Sub-DTOs ---

/**
 *
 */
export interface HourlyTrafficDto {
  hour: number;
  attention_count: number;
}

/**
 *
 */
export interface BranchTrafficDto {
  branch_id: number;

  attention_count: number;
  percentage: number;
}

/**
 *
 */
export interface DayOfWeekTrafficDto {
  day_of_week: string;
  attention_count: number;
  percentage: number;
}

/**
 *
 */
export interface StageTimeDto {
  stage: string;
  average_time_minutes: number;
}

/**
 *
 */
export interface UrgencyComparisonDto {
  urgent_count: number;
  non_urgent_count: number;
  urgent_avg_time_minutes: number;
  non_urgent_avg_time_minutes: number;
}

/**
 *
 */
export interface CancellationByStateDto {
  cancelled_at_state: string;
  cancellation_count: number;
}

/**
 *
 */
export interface ExtractorPerformanceDto {
  extractor_id: number;
  attentions_handled: number;
  average_extraction_time_minutes: number;
}

/**
 *
 */
export interface BoxUtilizationDto {
  box_number: number;
  attentions_count: number;
  percentage: number;
}

/**
 *
 */
export interface AnalysisFrequencyDto {
  analysis_id: number;
  request_count: number;
}
