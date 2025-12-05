/**
 * Area DTO from GET /api/v2/configuration/areas/{id}
 */
export interface AreaDTO {
  /**
   * Unique identifier of the area
   */
  id: number;

  /**
   * Name of the area
   */
  name: string;

  /**
   * Type of area
   */
  type: string;

  /**
   * Whether this area is external
   */
  isExternal: boolean;

  /**
   * Whether this area is active
   */
  isActive: boolean;

  /**
   * Branch identifier
   */
  branchId: number;
}

/**
 * Section DTO from GET /api/v2/configurations/areas/{areaId}/sections
 */
export interface SectionDTO {
  /**
   * Unique identifier of the section
   */
  id: number;

  /**
   * Name of the section
   */
  name: string;

  /**
   * Whether this section is active
   */
  isActive: boolean;
}

