/**
 * Patient export configuration
 * Defines the column structure for patient exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';
import * as PatientDataHelpers from '../../../../shared/utils/patient-data-helpers.util';

import { PatientRow } from './patient-list.model';

/**
 * Status label mapping
 */
export const PATIENT_STATUS_LABELS: Record<string, string> = {
  MIN: 'Mínimo',
  COMPLETE: 'Completo',
  VERIFIED: 'Verificado',
  DEACTIVATED: 'Desactivado'
};

/**
 * Column definitions for patient exports
 * Used by both Excel and PDF export services
 */
export const PATIENT_EXPORT_COLUMNS: ExportColumn<PatientRow>[] = [
  {
    header: 'DNI',
    getValue: (patient) => patient.dni || '-',
    width: 12
  },
  {
    header: 'Apellido',
    getValue: (patient) => patient.lastName || '-',
    width: 20
  },
  {
    header: 'Nombre',
    getValue: (patient) => patient.firstName || '-',
    width: 20
  },
  {
    header: 'Fecha de Nacimiento',
    getValue: (patient) => PatientDataHelpers.formatBirthDate(patient.birthDate) || '-',
    width: 18
  },
  {
    header: 'Edad',
    getValue: (patient) => PatientDataHelpers.calculateAge(patient.birthDate) || '-',
    width: 12
  },
  {
    header: 'Género',
    getValue: (patient) => PatientDataHelpers.translateGender(patient.gender) || '-',
    width: 15
  },
  {
    header: 'Sexo al Nacer',
    getValue: (patient) => PatientDataHelpers.translateGender(patient.sexAtBirth) || '-',
    width: 15
  },
  {
    header: 'Email',
    getValue: (patient) => PatientDataHelpers.extractEmail(patient) || '-',
    width: 30
  },
  {
    header: 'Teléfono',
    getValue: (patient) => PatientDataHelpers.extractPhone(patient) || '-',
    width: 18
  },
  {
    header: 'Dirección',
    getValue: (patient) =>
      PatientDataHelpers.formatAddress(PatientDataHelpers.extractPrimaryAddress(patient)) || '-',
    width: 40
  },
  {
    header: 'Localidad',
    getValue: (patient) => PatientDataHelpers.extractLocality(patient) || '-',
    width: 20
  },
  {
    header: 'Provincia',
    getValue: (patient) => PatientDataHelpers.extractProvince(patient) || '-',
    width: 20
  },
  {
    header: 'Código Postal',
    getValue: (patient) => PatientDataHelpers.extractPrimaryAddress(patient)?.zipCode || '-',
    width: 12
  },
  {
    header: 'Obra Social',
    getValue: (patient) => PatientDataHelpers.extractInsurerName(patient) || '-',
    width: 25
  },
  {
    header: 'Plan',
    getValue: (patient) => PatientDataHelpers.extractPlanName(patient) || '-',
    width: 25
  },
  {
    header: 'Número de Afiliado',
    getValue: (patient) => PatientDataHelpers.extractAffiliateNumber(patient) || '-',
    width: 20
  },
  {
    header: 'Estado',
    getValue: (patient) => PATIENT_STATUS_LABELS[patient.status ?? 'MIN'] || patient.status || 'Mínimo',
    width: 15
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const PATIENT_PDF_COLUMNS: ExportColumn<PatientRow>[] = [
  {
    header: 'DNI',
    getValue: (patient) => patient.dni || '-',
    width: 16
  },
  {
    header: 'Apellido',
    getValue: (patient) => patient.lastName || '-',
    width: 18
  },
  {
    header: 'Nombre',
    getValue: (patient) => patient.firstName || '-',
    width: 18
  },
  {
    header: 'F. Nac.',
    getValue: (patient) => PatientDataHelpers.formatBirthDate(patient.birthDate) || '-',
    width: 16
  },
  {
    header: 'Edad',
    getValue: (patient) => PatientDataHelpers.calculateAge(patient.birthDate) || '-',
    width: 10
  },
  {
    header: 'Género',
    getValue: (patient) => PatientDataHelpers.translateGender(patient.gender) || '-',
    width: 14
  },
  {
    header: 'Sexo',
    getValue: (patient) => PatientDataHelpers.translateGender(patient.sexAtBirth) || '-',
    width: 14
  },
  {
    header: 'Email',
    getValue: (patient) => PatientDataHelpers.extractEmail(patient) || '-',
    width: 24
  },
  {
    header: 'Teléfono',
    getValue: (patient) => PatientDataHelpers.extractPhone(patient) || '-',
    width: 16
  },
  {
    header: 'Dirección',
    getValue: (patient) =>
      PatientDataHelpers.formatAddress(PatientDataHelpers.extractPrimaryAddress(patient)) || '-',
    width: 28
  },
  {
    header: 'Localidad',
    getValue: (patient) => PatientDataHelpers.extractLocality(patient) || '-',
    width: 18
  },
  {
    header: 'Provincia',
    getValue: (patient) => PatientDataHelpers.extractProvince(patient) || '-',
    width: 16
  },
  {
    header: 'CP',
    getValue: (patient) => PatientDataHelpers.extractPrimaryAddress(patient)?.zipCode || '-',
    width: 10
  },
  {
    header: 'O. Social',
    getValue: (patient) => PatientDataHelpers.extractInsurerName(patient) || '-',
    width: 16
  },
  {
    header: 'Plan',
    getValue: (patient) => PatientDataHelpers.extractPlanName(patient) || '-',
    width: 16
  },
  {
    header: 'N° Afiliado',
    getValue: (patient) => PatientDataHelpers.extractAffiliateNumber(patient) || '-',
    width: 16
  },
  {
    header: 'Estado',
    getValue: (patient) => PATIENT_STATUS_LABELS[patient.status ?? 'MIN'] || patient.status || 'Mínimo',
    width: 14
  }
];
