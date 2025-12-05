
/**
 * Data Transfer Objects (DTOs) for patient analytics and reporting.
 * These interfaces define the structure of data used in patient reporting features.
 */

/**
 * Request parameters for patient reports.
 */
export interface PatientReportRequestDto {
  startDate?: string;
  endDate?: string;
  gender?: string;
  sexAtBirth?: string;
  minAge?: number;
  maxAge?: number;
  planId?: number;
}

/**
 * Represents a monthly patient registration report.
 */
export interface MonthlyPatientsReportDto {
  /** The year of the report */
  year: number;
  /** The month of the report (1-12) */
  month: number;
  /** Number of new patients registered in the given month */
  newPatients: number;
  /** List of patient summaries for the given month */
  patients: PatientSummaryDto[];
}

/**
 * Summary information about a patient for reporting purposes.
 */
export interface PatientSummaryDto {
  /** Unique identifier of the patient */
  id: number;
  /** First name of the patient */
  firstName: string;
  /** Last name of the patient */
  lastName: string;
  /** National identification number */
  dni: string;
  /** Gender identity of the patient */
  gender: string;
  /** Sex assigned at birth */
  sexAtBirth: string;
  /** Date of birth in ISO format (YYYY-MM-DD) */
  birthDate: string;
}

/**
 * Represents the distribution of patients by age and gender.
 */
export interface AgeGenderDistributionDto {
  /** Gender identity category */
  gender: string;
  /** Sex assigned at birth */
  sexAtBirth: string;
  /** Minimum age in the distribution range */
  minAge: number;
  /** Maximum age in the distribution range */
  maxAge: number;
  /** Total number of patients in this category */
  total: number;
}

/**
 * Represents patient distribution by coverage plan with age and gender breakdown.
 */
export interface CoverageAgeGenderDto {
  /** Name of the coverage/insurance plan */
  coverageName: string;
  /** Gender identity category */
  gender: string;
  /** Sex assigned at birth */
  sexAtBirth: string;
  /** Minimum age in the distribution range */
  minAge: number;
  /** Maximum age in the distribution range */
  maxAge: number;
  /** Total number of patients in this category */
  total: number;
  /** Average age of patients in this category */
  averageAge: number;
}

/**
 * Represents a patient record with incomplete or missing information.
 */
export interface PatientIncompleteDataDto {
  /** Unique identifier of the patient */
  id: number;
  /** National identification number */
  dni: string;
  /** Full name of the patient (first name + last name) */
  fullName: string;
  /** Gender identity */
  gender: string;
  /** Sex assigned at birth */
  sexAtBirth: string;
  /** Date of birth in ISO format (YYYY-MM-DD) */
  birthDate: string;
  /** Comma-separated list of missing or incomplete fields */
  missingFields: string[];
}

/**
 * Comprehensive dashboard data for patient analytics.
 */
export interface PatientDashboardDto {
  /** Total number of patients in the system */
  totalPatients: number;
  /** Percentage growth rate of patient registrations */
  growthRate: number;
  /** Percentage of patients with incomplete data */
  incompleteDataPercent: number;
  /** Monthly registration statistics */
  newPatientsPerMonth: MonthlyPatientsReportDto[];
  /** Patient distribution by age group and gender */
  byAgeGroup: AgeGenderDistributionDto[];
  /** Patient distribution by coverage plan with demographics */
  byCoverage: CoverageAgeGenderDto[];
}
