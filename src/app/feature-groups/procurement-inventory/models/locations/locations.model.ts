/**
 * Request Location DTO
 * Note: address is now nullable/optional (not required for all location types)
 * branchId is used for level 1 locations (WAREHOUSE) when not using address
 */
export interface RequestLocationDTO {
  name: string;
  locationType?: string;       // camelCase - interceptor converts to snake_case
  parentLocationId?: number;   // camelCase - interceptor converts to parent_location_id
  branchId?: number;          // camelCase - interceptor converts to branch_id
  address?: string | null;     // Optional/nullable - not required for all location types
  isActive?: boolean;
}

/**
 * Create Branch Location DTO
 * Used to automatically create a Location when a new Branch is created
 */
export interface CreateBranchLocationDTO {
  branchId: number;
  name: string;
}

/**
 * Response Location DTO
 */
export interface ResponseLocationDTO {
  id: number;
  name: string;
  locationType: string;
  parentLocationId?: number;
  parentLocationName?: string;
  branchId?: number;            // Changed from string to number for consistency
  address?: string | null;      // Nullable
  level: string;
  isActive: boolean;
}

/**
 * Location Update DTO
 */
export interface LocationUpdateDTO {
  name?: string;
  locationType?: string;
  parentLocationId?: number;
  branchId?: number;
  address?: string | null;      // Nullable
  isActive?: boolean;
}

/**
 * Location Deactivate DTO
 */
export interface LocationDeactivateDTO {
  userId: number;
}

/**
 * Location Filters DTO
 */
export interface LocationFiltersDTO {
  name?: string;
  locationType?: string;
  parentId?: number;
  term?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Location Type DTO
 */
export interface LocationTypeDTO {
  code: string;
  label: string;
}

/**
 * Location Tree DTO
 */
export interface LocationTreeDTO {
  id: number;
  name: string;
  locationType: string;
  locationTypeDescription: string;
  level: string;
  isActive: boolean;
  children: LocationTreeDTO[];
}

/**
 * Can Be Parent DTO
 */
export interface CanBeParentDTO {
  canBeParent: boolean;
  currentDepth: number;
  reason?: string;
  maxDepth: number;
}

/**
 * Page Response DTO
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export enum LocationType {
  /** Main warehouse for central storage and distribution of supplies. */
  WAREHOUSE = 'WAREHOUSE',

  /** Branch or subsidiary location of the organization. */
  BRANCH = 'BRANCH',

  /** Administrative office location. */
  OFFICE = 'OFFICE',

  /** Laboratory or research area where materials are analyzed or used. */
  LABORATORY = 'LABORATORY',

  /** Specific area or sector within a larger location (e.g., production area, cold room, etc.). */
  AREA = 'AREA',

  /** External location such as a partner institution or client site. */
  EXTERNAL = 'EXTERNAL',

  /** Storage area or room within a facility. */
  STORAGE_ROOM = 'STORAGE_ROOM',

  /** Refrigerated storage unit or cold room. */
  REFRIGERATOR = 'REFRIGERATOR',

  /** Freezer for frozen storage. */
  FREEZER = 'FREEZER',

  /** Shelf or shelving unit for organized storage. */
  SHELF = 'SHELF',

  /** Cabinet for secure or organized storage. */
  CABINET = 'CABINET',

  /** Drawer within a cabinet or storage unit. */
  DRAWER = 'DRAWER',

  /** Bin or container for small items. */
  BIN = 'BIN',

  /** Quarantine area for isolated or restricted items. */
  QUARANTINE = 'QUARANTINE',

  /** Archive storage for historical records or samples. */
  ARCHIVE = 'ARCHIVE'
}

/**
 * Location Type Labels mapping
 */
export const LocationTypeLabels: Record<LocationType, string> = {
  [LocationType.WAREHOUSE]: 'Depósito Central',
  [LocationType.BRANCH]: 'Sucursal',
  [LocationType.OFFICE]: 'Oficina',
  [LocationType.LABORATORY]: 'Laboratorio',
  [LocationType.AREA]: 'Área Interna',
  [LocationType.EXTERNAL]: 'Ubicación Externa',
  [LocationType.STORAGE_ROOM]: 'Sala de Almacenamiento',
  [LocationType.REFRIGERATOR]: 'Refrigerador',
  [LocationType.FREEZER]: 'Congelador',
  [LocationType.SHELF]: 'Estantería',
  [LocationType.CABINET]: 'Armario',
  [LocationType.DRAWER]: 'Cajón',
  [LocationType.BIN]: 'Contenedor',
  [LocationType.QUARANTINE]: 'Área de Cuarentena',
  [LocationType.ARCHIVE]: 'Archivo'
};

/**
 * Location validation constants
 */
export const LocationValidationConstants = {
  MAX_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 255,
  NAME_PATTERN: '^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\\s\\-_().]+$'
};

export const LOCATION_TYPE_OPTIONS = Object.entries(LocationType).map(([key, value]) => ({
  value: key,
  label: value
}));
