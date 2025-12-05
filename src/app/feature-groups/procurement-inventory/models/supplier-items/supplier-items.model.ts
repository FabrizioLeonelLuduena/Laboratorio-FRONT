/**
 * Contact information for a supplier
 */
export interface SupplierContactDTO {
  id: number;
  label: string;
  description: string;
  contactType: string;
  isActive: boolean;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  createdUser: string;
  updatedUser: string;
  supplierId: number;
}

/**
 * Supplier information
 */
export interface SupplierDTO {
  id: number;
  companyName: string;
  cuit: string;
  isActive: boolean;
  contacts: SupplierContactDTO[];
  createdDateTime: string;
  lastUpdatedDateTime: string;
  reason: string;
}

/**
 * Response DTO for supplier item
 */
export interface ResponseSupplierItemDTO {
  id: number;
  itemCode: string | null;
  description: string;
  unitPrice: string;
  supplier: SupplierDTO;
}

/**
 * Extended response DTO for supplier items by supplier ID
 * Includes complete supply, packaging, and unit of measure information
 * Endpoint: GET /api/v1/stock/supplier-items/supplier/{id}
 */
export interface ResponseSupplierItemsBySupplierIdDTO {
    /** Unique identifier for the supplier item */
    id: number;
    /** Item code (optional) */
    itemCode: string | null;
    /** Item description */
    description: string;
    /** Unit price as string */
    unitPrice: string;
    /** Supplier information */
    supplier: Supplier;
    /** Supply ID reference */
    supplyId: number;
    /** Complete supply information */
    supply: Supply;
    /** Unit of measure ID reference */
    unitOfMeasureId: number;
    /** Complete unit of measure information */
    unitOfMeasure: UnitOfMeasure;
    /** Packaging ID reference */
    packagingId: number;
    /** Complete packaging information */
    packaging: Packaging;
    /** Availability status (optional) */
    available: boolean | null;
    /** Lead time in days (optional) */
    leadTimeDays: number | null;
    /** Minimum order quantity (optional) */
    minOrderQuantity: number | null;
}

/**
 * Packaging information for supplier items
 * Contains unit of measure and packaging hierarchy details
 */
export interface Packaging {
    /** Unique identifier for the packaging */
    id: number;
    /** Whether the packaging is active */
    active: boolean;
    /** Number of units per package */
    unitsPerPackage: number;
    /** Unit of measure ID */
    uomId: number;
    /** Unit of measure name */
    uomName: string;
    /** Parent packaging ID for hierarchical packaging */
    packagingFatherId: number | null;
}

/**
 * Supplier information (snake_case format from backend)
 * Used in supplier item responses
 */
export interface Supplier {
    /** Unique identifier for the supplier */
    id: number;
    /** Company name or business name */
    company_name: string;
    /** CUIT (tax identification number) */
    cuit: string;
    /** Whether the supplier is active */
    is_active: boolean;
    /** List of supplier contacts */
    contacts: Contact[];
    /** Creation timestamp */
    created_date_time: Date;
    /** Last update timestamp */
    last_updated_date_time: Date;
    /** Deactivation reason (if applicable) */
    reason: null;
}

/**
 * Contact information for a supplier (snake_case format from backend)
 */
export interface Contact {
    /** Unique identifier for the contact */
    id: number;
    /** Contact label or name */
    label: string;
    /** Contact description */
    description: string;
    /** Type of contact (e.g., phone, email) */
    contact_type: string;
    /** Whether the contact is active */
    is_active: boolean;
    /** Creation timestamp */
    created_date_time: Date;
    /** Last update timestamp */
    last_updated_date_time: Date;
    /** User who created the contact */
    created_user: string;
    /** User who last updated the contact */
    updated_user: string;
    /** Associated supplier ID */
    supplier_id: number;
}

/**
 * Supply (product/material) information
 * Used in supplier item responses
 */
export interface Supply {
    /** Unique identifier for the supply */
    id: number;
    /** Supply name */
    name: string;
    /** Additional notes */
    notes: string;
    /** Category ID */
    category_id: number;
    /** Category name */
    category_name: string;
    /** Packaging ID */
    packaging_id: number;
    /** Stock Keeping Unit code */
    sku: string;
    /** Whether the supply is active */
    active: boolean;
    /** Base unit of measure ID */
    base_uom_id: null;
    /** Base unit of measure code */
    base_uom_code: null;
}

/**
 * Unit of measure information
 * Defines measurement units for supplies
 */
export interface UnitOfMeasure {
    /** Unique identifier for the unit of measure */
    id: number;
    /** Unit of measure name (e.g., kg, liters, units) */
    name: string;
    /** Whether the unit of measure is active */
    is_active: boolean;
}
