/**
 *
 */
export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';

/**
 * Doctor entity from the API
 */
export type Status = 'ACTIVE' | 'INACTIVE';

/**
 * Registration types
 */
export type RegistrationType = string;

/**
 *
 */
export interface Doctor {
  id?: number;
  name: string;
  tuition?: string;
  email?: string;
  active: boolean;
  gender?: Gender;
  observations?: string;
}

/** Doctor entity returned by the API */
export interface DoctorResponse {
  id: number;
  name: string;
  lastName: string;
  tuition: string;
  registration?: string;
  registrationType?: RegistrationType;
  email?: string;
  status?: Status;
  gender?: Gender;
  title?: string;
  /** Free-text observations */
  observations?: string;
}

/** Payload to create/update a doctor */
export interface DoctorRequest {
  name: string;
  lastName: string;
  tuition: string;
  registration?: RegistrationType;
  email?: string;
  gender: Gender;
  observations?: string;
}

/** Page wrapper for doctors list */
export interface DoctorPageResponse {
  content: DoctorResponse[];
  totalElements: number;
}
