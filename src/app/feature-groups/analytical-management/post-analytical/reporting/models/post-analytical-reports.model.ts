/**
 * Modelos para reportería post-analítica
 */

// ════════════════════════════════════════════════════════════════
// Filtros
// ════════════════════════════════════════════════════════════════

/**
 * Filtros para reportes post-analíticos.
 * Se mapean a query params del backend.
 */
export interface ReportingFilters {
  startDate?: Date;
  endDate?: Date;
  minAge?: number;
  maxAge?: number;
  gender?: 'MALE' | 'FEMALE';
  analysisId?: number; // Para filtrar por análisis específico (screening)
  resultValue?: string; // Para filtrar por Positivo/Negativo (screening)
}

// ════════════════════════════════════════════════════════════════
// Validated Results Report (Resultados Validados)
// ════════════════════════════════════════════════════════════════

/**
 *
 */
export interface ValidatedResultsReport {
  startDate: string;
  endDate: string;
  generationDate: string;
  totalCount: number;
  details: ValidatedResultDetail[];
  statistics: ValidatedResultsStatistics;
}

/**
 *
 */
export interface ValidatedResultDetail {
  patientName: string;
  patientDocument: string;
  patientBirthDate: string;
  patientGender: string;
  practiceName: string;
  practiceCode: number;
  biochemistName: string;
  resultSignatureDateTime: string;
  emissionDateTime: string;
}

/**
 *
 */
export interface ValidatedResultsStatistics {
  countByDay: Record<string, number>;
  countByPractice: Record<string, number>;
  countByBiochemist: Record<string, number>;
}

// ════════════════════════════════════════════════════════════════
// Corrected Results Report (Resultados Corregidos)
// ════════════════════════════════════════════════════════════════

/**
 *
 */
export interface CorrectedResultsReport {
  startDate: string;
  endDate: string;
  generationDate: string;
  totalCount: number;
  details: CorrectedResultDetail[];
  statistics: CorrectedResultsStatistics;
}

/**
 *
 */
export interface CorrectedResultDetail {
  patientName: string;
  patientDocument: string;
  patientBirthDate: string;
  patientGender: string;
  practiceName: string;
  practiceCode: number;
  determinationName: string;
  correctionCount: number;
  lastCorrectionDateTime: string;
  currentValue: string;
}

/**
 *
 */
export interface CorrectedResultsStatistics {
  countByDay: Record<string, number>;
  countByPractice: Record<string, number>;
  totalCorrections: number;
  averageCorrectionsPerResult: number;
}

// ════════════════════════════════════════════════════════════════
// Out of Range Results Report (Resultados Fuera de Rango)
// ════════════════════════════════════════════════════════════════

/**
 *
 */
export interface OutOfRangeReport {
  startDate: string;
  endDate: string;
  generationDate: string;
  totalCount: number;
  details: OutOfRangeDetail[];
  statistics: OutOfRangeStatistics;
}

/**
 *
 */
export interface OutOfRangeDetail {
  patientName: string;
  patientDocument: string;
  patientBirthDate: string;
  patientGender: string;
  practiceName: string;
  practiceCode: number;
  determinationName: string;
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
  alterationType: 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW';
  resultSignatureDateTime: string;
}

/**
 *
 */
export interface OutOfRangeStatistics {
  countByDay: Record<string, number>;
  countByPractice: Record<string, number>;
  countByAlterationType: Record<string, number>;
  percentageOutOfRange: number;
}

// ════════════════════════════════════════════════════════════════
// Delayed Results Report (Resultados Demorados)
// ════════════════════════════════════════════════════════════════

/**
 *
 */
export interface DelayedResultsReport {
  startDate: string;
  endDate: string;
  generationDate: string;
  totalCount: number;
  details: DelayedResultDetail[];
  statistics: DelayedResultsStatistics;
}

/**
 * Detalle de un resultado demorado
 */
export interface DelayedResultDetail {
  patientName: string;
  patientDocument: string;
  patientBirthDate: string;
  patientGender: string;
  practiceName: string;
  practiceCode: number;
  currentStatus: string;
  receivedDateTime: string;
  expectedTatMinutes: number;
  elapsedMinutes: number;
  delayMinutes: number;
  delayPercentage: number;
}

/**
 * Estadísticas de resultados demorados
 */
export interface DelayedResultsStatistics {
  countByDay: Record<string, number>;
  countByPractice: Record<string, number>;
  countByStatus: Record<string, number>;
  averageDelayMinutes: number;
  maxDelayMinutes: number;
  minDelayMinutes: number;
  totalResultsProcessed: number;
  delayedResultsCount: number;
  onTimeResultsCount: number;
  delayedPercentage: number;
  onTimePercentage: number;
}

// ════════════════════════════════════════════════════════════════
// Age Group & Gender Statistics Report
// ════════════════════════════════════════════════════════════════

/**
 * Reporte de estadísticas por grupo etario y género
 */
export interface AgeGroupGenderReport {
  startDate: string;
  endDate: string;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  generationDate: string;
  totalResultsAnalyzed: number;
  statistics: AgeGroupGenderStatistic[];
  overallSummary: AgeGroupGenderOverallSummary;
}

/**
 * Estadística de un grupo etario y género específico
 */
export interface AgeGroupGenderStatistic {
  ageGroup: string;
  gender: string;
  totalCount: number;
  normalCount: number;
  criticalCount: number;
  normalPercentage: number;
  criticalPercentage: number;
}

/**
 * Resumen general de todos los grupos
 */
export interface AgeGroupGenderOverallSummary {
  totalNormal: number;
  totalCritical: number;
  overallNormalPercentage: number;
  overallCriticalPercentage: number;
}

// ════════════════════════════════════════════════════════════════
// Screening Results Report
// ════════════════════════════════════════════════════════════════

/**
 * Report of screening results.
 */
export interface ScreeningResultsReport {
  startDate: string;
  endDate: string;
  generationDate: string;
  totalResults: number;
  positiveCount: number;
  negativeCount: number;
  positivePercentage: number;
  negativePercentage: number;
  details: ScreeningResultDetail[];
  statistics: ScreeningResultsStatistics;
}

/**
 * Detailed information of a screening result.
 */
export interface ScreeningResultDetail {
  patientName: string;
  patientDocument: string;
  patientBirthDate: string;
  patientGender: string;
  screeningType: string;
  screeningCode: number;
  result: string;
  isPositive: boolean;
  performedDateTime: string;
}

/**
 * Statistics for screening results.
 */
export interface ScreeningResultsStatistics {
  countByDate: Record<string, number>;
  countByAnalysis: Record<string, number>;
  countByGender: Record<string, number>;
  countByResult: Record<string, number>;
  countByAgeRange: Record<string, number>;
}


