/**
 * Patient List View Models
 * Models specific to the patient list view, extending the base PatientResponse
 */

import { PatientResponse } from '../../models/PatientModel';

/**
 * Row model used by the patient list table.
 * Extends {@link PatientResponse} with additional computed properties for display.
 * These properties are derived from the base patient data and used for UI rendering.
 */
export interface PatientRow extends PatientResponse {
  // Computed properties for table display
  age?: number | null;
  ageLabel?: string | null;
  primaryCoverage?: string | null;
  fullName?: string;
  statusText?: string;
  phone?: string;
  insurerName?: string;
  // Localized labels for UI only (do not override domain fields)
  genderLabel?: string | null;
  sexAtBirthLabel?: string | null;
}
