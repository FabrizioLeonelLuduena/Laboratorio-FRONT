import { ActivableEntity } from '../common.models';

/**
 * Supply category enumeration as defined in backend API contract
 * Used for classification of inventory items by their functional domain
 */
export enum SupplyCategoryEnum {
  MEDICAL = 'MEDICAL',
  CLEANING = 'CLEANING',
  OFFICE = 'OFFICE',
  FOOD = 'FOOD',
  MAINTENANCE = 'MAINTENANCE',
  SAFETY = 'SAFETY'
}

/**
 * Unit of measure enumeration for inventory quantification
 * Maps to backend UnitOfMeasure enum values
 */
export enum UnitOfMeasure {
  BOX = 'BOX',
  UNIT = 'UNIT',
  PACKAGE = 'PACKAGE',
  LITER = 'LITER',
  KILOGRAM = 'KILOGRAM',
  DOZEN = 'DOZEN',
  PAIR = 'PAIR'
}

/**
 * Validation constraints constants matching backend validation rules
 * Source: Backend CreateSupplyRequestDTO validation annotations
 */
export const SupplyValidationConstants = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_NAME_LENGTH: 3,
  MAX_UNIT_LENGTH: 50,
  MAX_CATEGORY_LENGTH: 100
};

// ==============================================
// SUPPLY MODELS
// ==============================================

/**
 * Request DTO for supply entity creation
 * Contract: POST /api/v1/stock/supplies
 * Matches backend CreateSupplyRequestDTO
 *
 * NOTE: baseUomId is OPTIONAL - if not provided, it will be auto-completed from packaging.uom
 */
export interface CreateSupplyRequestDTO {
  name: string;
  notes?: string;
  categoryId: number;
  packagingId: number;        // REQUIRED - Packaging is mandatory
  sku?: string;
  baseUomId?: number;         // OPTIONAL - Auto-completed from packaging if not provided
  baseUomCode?: string;
  isActive?: boolean;
}

/**
 * Interface for supply form values from generic dynamic form
 * Used in create/edit supply components to ensure type safety
 */
export interface SupplyFormData {
  name: string;
  description: string;
  unitOfMeasure: string;
  category: string;
  supplyTypeId: number;
  minimumStock: number;
  maximumStock: number;
}

/**
 * Response DTO returned after successful supply creation
 * Contract: POST /api/supplies response (201 Created)
 */
export interface CreateSupplyResponseDTO {
  message: string;
  supply: SupplyDTO;
}

/**
 * Complete supply entity data transfer object
 * Used in create/update response payloads
 */
export interface SupplyDTO extends ActivableEntity{
  id: number;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  category: string;
  supplyTypeId: number;
  supplyTypeName: string;           // Resolved from supply type reference
  minimumStock: number;
  maximumStock: number;
}

/**
 * DTO for supply update
 * Contract: PUT /api/v1/stock/supplies/{id}
 *
 * NOTE: Both baseUomId and packagingId are OPTIONAL in updates
 * If packagingId changes, baseUomId will be auto-updated from the new packaging
 */
export interface SupplyUpdateDTO {
  name: string;
  sku?: string;
  notes?: string;
  categoryId: number;
  baseUomId?: number;         // OPTIONAL - Auto-completed from packaging if not provided
  packagingId?: number;       // OPTIONAL - But if changed, UOM auto-updates
  isActive?: boolean;
}

/**
 * Supply entity DTO for listing and detail views
 * Contract: GET /api/supplies response content item
 */
export interface SupplyDetailResponseDTO extends ActivableEntity{
  id: number;
  name: string;
  description: string | null;
  notes?: string | null;
  unitOfMeasure: string;
  category: string;
  categoryId?: number;
  categoryName?: string;
  minimumStock: number;
  maximumStock: number;
  baseUomId?: number;
  baseUomCode?: string;
  packaging?: {
    id: number;
    unitsPerPackage: number;
    uomName: string;
  };
  packagingId?: number;
  sku?: string;
}

/**
 * Spring Boot paginated response wrapper for supply entities
 * Contract: GET /api/supplies (Page<SupplyDetailResponseDTO>)
 */
export interface SupplySearchResponseDTO {
  content: SupplyDetailResponseDTO[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  pageable: {
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
  };
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
}

/**
 * Query parameters for supply search/filtering operations
 * Contract: GET /api/supplies query params
 */
export interface SupplyFiltersDTO {
  name?: string;                    // Partial name search
  categoryId?: number;                // Filter by category id
  isActive?: boolean;                 // Filter by active status
  page?: number;                    // Zero-based page index
  size?: number;                    // Page size (items per page)
  sort?: string;                    // Sort specification (field,direction)
}

// ==============================================
// TRANSLATION HELPER FUNCTIONS
// ==============================================

/**
 * Translates supply category enum values to Spanish labels for UI display
 * @param category - Supply category enum value or name from backend
 * @returns Spanish translation of the supply category
 */
export function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    'MEDICAL': 'Médico',
    'CLEANING': 'Limpieza',
    'OFFICE': 'Oficina',
    'FOOD': 'Alimento',
    'MAINTENANCE': 'Maestranza',
    'SAFETY': 'Seguridad'
  };

  return translations[category] || category;
}

/**
 * Translates unit of measure enum values to Spanish labels for UI display
 * @param unit - Unit of measure enum value or name from backend
 * @returns Spanish translation of the unit of measure
 */
export function translateUnitOfMeasure(unit: string): string {
  const translations: Record<string, string> = {
    'MILLILITER': 'Mililitro',
    'LITER': 'Litro',
    'UNIT': 'Unidad',
    'PACKAGE': 'Paquete',
    'BOX': 'Caja',
    'BOTTLE': 'Botella',
    'KIT': 'Kit',
    'ROLL': 'Rollo',
    'PAIR': 'Par',
    'GRAM': 'Gramo',
    'KILOGRAM': 'Kilogramo'
  };

  return translations[unit] || unit;
}

/**
 * Returns all supply categories sorted alphabetically by their Spanish translation
 * @returns Array of category enum values sorted alphabetically
 */
export function getCategoriesSorted(): string[] {
  const categories = Object.values(SupplyCategoryEnum);
  return categories.sort((a, b) =>
    translateCategory(a).localeCompare(translateCategory(b), 'es')
  );
}

// ==============================================
// ERROR RESPONSE MODEL
// ==============================================

/**
 * Standard backend error response structure
 * Based on RFC 7807 Problem Details for HTTP APIs
 */
export interface ErrorResponse {
  code: string;
  message: string;
}
