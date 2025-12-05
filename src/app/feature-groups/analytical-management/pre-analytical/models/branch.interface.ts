/**
 * Branch resume DTO - minimal information for dropdowns/filters
 */
export interface BranchResumeDTO {
  id: number;
  code: string;
  description: string;
  latitude: number;
  longitude: number;
  box_count: number;
  register_count: number;
}

/**
 * Section response DTO
 */
export interface SectionResponseDTO {
  id: number;
  name: string;
}

/**
 * Area response DTO
 */
export interface AreaResponseDTO {
  id: number;
  name: string;
  type: string;
  is_external: boolean;
  is_active: boolean;
  sections: SectionResponseDTO[];
}

/**
 * Branch response DTO - complete information including areas
 */
export interface BranchResponseDTO {
  id: number;
  code: string;
  description: string;
  status: string;
  responsible_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
  last_updated_datetime: string;
  last_updated_user: string;
  box_count: number;
  register_count: number;
  areas: AreaResponseDTO[];
}
