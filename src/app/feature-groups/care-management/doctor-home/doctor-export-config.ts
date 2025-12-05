/**
 * Doctor export configuration
 * Defines the column structure for doctor exports using generic services
 */

import { ExportColumn } from '../../../shared/services/export';
import { DoctorResponse } from '../models/doctors.model';

/**
 * Gender label mapping
 */
const GENDER_LABELS: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  NON_BINARY: 'No binario',
  PREFER_NOT_TO_SAY: 'Prefiere no decir'
};

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo'
};

/**
 * Translate gender to Spanish
 */
function translateGender(gender: string | undefined): string {
  if (!gender) return '-';
  return GENDER_LABELS[gender] || gender;
}

/**
 * Translate status to Spanish
 */
function translateStatus(status: string | undefined): string {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
}

/**
 * Extract title prefix (Dr./Dra.) based on gender
 */
function getTitle(gender: string | undefined): string {
  if (gender === 'FEMALE') return 'Dra.';
  if (gender === 'MALE') return 'Dr.';
  return 'Dr./Dra.';
}

/**
 * Column definitions for doctor Excel exports
 */
export const DOCTOR_EXPORT_COLUMNS: ExportColumn<DoctorResponse>[] = [
  {
    header: 'Nombre Completo',
    getValue: (doctor) => {
      const title = getTitle(doctor.gender);
      return `${title} ${doctor.name}` || '-';
    },
    width: 35
  },
  {
    header: 'Matrícula',
    getValue: (doctor) => doctor.tuition || '-',
    width: 18
  },
  {
    header: 'Correo Electrónico',
    getValue: (doctor) => doctor.email || '-',
    width: 35
  },
  {
    header: 'Género',
    getValue: (doctor) => translateGender(doctor.gender),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (doctor) => translateStatus(doctor.status),
    width: 15
  }
];

/**
 * Column definitions for doctor PDF exports (abbreviated headers)
 */
export const DOCTOR_PDF_COLUMNS: ExportColumn<DoctorResponse>[] = [
  {
    header: 'Nombre Completo',
    getValue: (doctor) => {
      const title = getTitle(doctor.gender);
      return `${title} ${doctor.name}` || '-';
    },
    width: 60
  },
  {
    header: 'Matrícula',
    getValue: (doctor) => doctor.tuition || '-',
    width: 35
  },
  {
    header: 'Correo',
    getValue: (doctor) => doctor.email || '-',
    width: 55
  },
  {
    header: 'Género',
    getValue: (doctor) => translateGender(doctor.gender),
    width: 25
  },
  {
    header: 'Estado',
    getValue: (doctor) => translateStatus(doctor.status),
    width: 20
  }
];
