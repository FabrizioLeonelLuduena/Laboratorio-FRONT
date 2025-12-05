/**
 * Packaging DTO
 * Contains information about packaging units and their relationships
 */
export interface PackagingDTO {
  id: number;
  unitsPerPackage: number;
  supplyId: number;
  supplyName: string;
  uomId: number;
  uomName: string;
  packagingFatherId?: number;
  active: boolean;
}

/**
 * Response Packaging DTO
 * Used for simple packaging responses
 */
export interface ResponsePackagingDTO {
  id: number;
  name: string;
  code: string;
  description: string;
}

/**
 * Request Packaging DTO
 * Used for creating or updating packaging
 */
export interface PackagingRequestDTO {
  unitsPerPackage: number;
  supplyId: number;
  uomId: number;
  packagingFatherId?: number;
}
