
/**
 * Insurer Contact Info Response
 */
export interface InsurerContactInfoResponseDTO {
  id: number;
  insurerId: number;
  contactType: string;
  contact: string;
  isActive: boolean;
}

/**
 *  Insurer Contact Info request for update
 */
export interface InsurerContactInfoUpdateRequestDTO {
  id: number;
  insurerId: number;
  contactType: string;
  contact: string;
}

/**
 * Insurer Contact Info request for create
 */
export interface InsurerContactInfoCreateRequestDTO {
  insurerId: number;
  contactType: string;
  contact: string;
}

/**
 *  Insurer Contact Info request for deletion
 */
export interface InsurerContactInfoDeleteRequestDTO {
  id: number;
}

/**
 * Contact Type Resoponse
 */
export interface ContactTypeResponseDTO {
  /** Code identifier of the contact type. */
  name: string;
  /** Human-readable description of the contact type. */
  description: string;
}
